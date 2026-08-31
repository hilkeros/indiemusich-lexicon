import { NextRequest, NextResponse } from "next/server";
import { Client } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as ch from "@/src/lexicons/ch";

const SPACE_TYPE = "ch.indiemusi.alpha.audioLibrary";
const COLLECTION = "ch.indiemusi.alpha.audioFile";

function spaceUri(did: string, skey: string) {
  return `at://${did}/space/${SPACE_TYPE}/${skey}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const spaceSkey = formData.get("spaceSkey") as string | null;
  const recordingUri = formData.get("recordingUri") as string | null;
  const file = formData.get("file") as File | null;

  if (!spaceSkey) return NextResponse.json({ error: "spaceSkey is required" }, { status: 400 });
  if (!recordingUri) return NextResponse.json({ error: "recordingUri is required" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const space = spaceUri(session.did, spaceSkey);
  const mimeType = file.type || "application/octet-stream";

  // 1. Upload the blob to the PDS
  const blobResponse = await session.fetchHandler("/xrpc/com.atproto.repo.uploadBlob", {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: await file.arrayBuffer(),
  });

  if (!blobResponse.ok) {
    const body = await blobResponse.json().catch(() => ({}));
    console.error("uploadBlob failed", { status: blobResponse.status, body });
    return NextResponse.json(
      { error: "Failed to upload audio blob", detail: (body as any)?.error, httpStatus: blobResponse.status },
      { status: 502 },
    );
  }

  const blobData = await blobResponse.json() as any;
  const blob = blobData.blob;

  // 2. Create the audioFile record in the space
  const audioFileRecord = {
    $type: COLLECTION,
    audio: blob,
    mimeType,
    byteSize: file.size,
    createdAt: new Date().toISOString(),
  };

  const createRecordResponse = await session.fetchHandler(
    "/xrpc/com.atproto.space.createRecord",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        space,
        repo: session.did,
        collection: COLLECTION,
        validate: false,
        record: audioFileRecord,
      }),
    },
  );

  if (!createRecordResponse.ok) {
    const body = await createRecordResponse.json().catch(() => ({}));
    console.error("createRecord failed", { status: createRecordResponse.status, body });
    return NextResponse.json(
      { error: "Failed to create audio file record", detail: (body as any)?.error, httpStatus: createRecordResponse.status },
      { status: 502 },
    );
  }

  const createData = await createRecordResponse.json() as any;
  const audioFileRkey: string = createData.rkey ?? createData.uri?.split("/").pop();

  // 3. Update the recording record with the audioFileRef
  const client = await getOAuthClient();
  const oauthSession = await client.restore(session.did);
  const lexClient = new Client(oauthSession);

  const recordingRkey = recordingUri.split("/").pop()!;
  const existing = await lexClient.get(ch.indiemusi.alpha.recording, { repo: session.did, rkey: recordingRkey });
  const existingValue = (existing as any)?.value ?? {};

  await lexClient.put(ch.indiemusi.alpha.recording, {
    ...existingValue,
    audioFile: {
      ownerDid: session.did,
      spaceSkey,
      rkey: audioFileRkey,
      mimeType,
    },
  }, { rkey: recordingRkey });

  return NextResponse.json({ rkey: audioFileRkey, mimeType });
}
