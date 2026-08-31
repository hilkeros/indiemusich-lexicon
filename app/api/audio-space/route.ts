import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const SPACE_TYPE = "ch.indiemusi.alpha.audioLibrary";

function spaceUri(did: string, skey: string) {
  return `at://${did}/space/${SPACE_TYPE}/${skey}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skey = request.nextUrl.searchParams.get("skey");
  if (!skey) {
    return NextResponse.json({ error: "skey is required" }, { status: 400 });
  }

  const pdsUrl: string = session.serverMetadata.issuer;
  const space = spaceUri(session.did, skey);
  const response = await session.fetchHandler(
    `/xrpc/com.atproto.simplespace.getSpace?space=${encodeURIComponent(space)}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = (body as any)?.error;

    if (error === "SpaceNotFound") {
      return NextResponse.json({ exists: false, pdsUrl });
    }

    if (
      response.status === 501 ||
      error === "MethodNotImplemented" ||
      error === "MethodNotFound" ||
      response.status === 404
    ) {
      return NextResponse.json({ exists: false, pdsUrl, notSupported: true });
    }

    console.error("getSpace failed", { status: response.status, error, body });
    return NextResponse.json(
      { error: "Failed to fetch space", detail: error, httpStatus: response.status, pdsUrl },
      { status: 502 },
    );
  }

  const data = (await response.json()) as any;
  const allowList: string[] = data?.appAccess?.allowed ?? [];
  return NextResponse.json({ exists: true, allowList, pdsUrl });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skey, allowList } = await request.json() as { skey: string; allowList: string[] };
  if (!skey) {
    return NextResponse.json({ error: "skey is required" }, { status: 400 });
  }
  if (!Array.isArray(allowList)) {
    return NextResponse.json({ error: "allowList must be an array" }, { status: 400 });
  }

  const response = await session.fetchHandler(
    "/xrpc/com.atproto.simplespace.createSpace",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: SPACE_TYPE,
        skey,
        policy: { $type: "com.atproto.simplespace.defs#publicPolicy" },
        appAccess: {
          $type: "com.atproto.simplespace.defs#allowList",
          allowed: allowList,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = (body as any)?.error;
    if (error === "SpaceAlreadyExists") {
      return NextResponse.json({ error: "Space already exists" }, { status: 409 });
    }
    console.error("createSpace failed", { status: response.status, error, body });
    return NextResponse.json({ error: "Failed to create space", detail: error, httpStatus: response.status }, { status: 502 });
  }

  const data = await response.json() as any;
  return NextResponse.json({ spaceUri: data.uri, allowList });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skey, allowList } = await request.json() as { skey: string; allowList: string[] };
  if (!skey) {
    return NextResponse.json({ error: "skey is required" }, { status: 400 });
  }
  if (!Array.isArray(allowList)) {
    return NextResponse.json({ error: "allowList must be an array" }, { status: 400 });
  }

  const space = spaceUri(session.did, skey);
  const response = await session.fetchHandler(
    "/xrpc/com.atproto.simplespace.updateSpace",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        space,
        appAccess: {
          $type: "com.atproto.simplespace.defs#allowList",
          allowed: allowList,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error("updateSpace failed:", body);
    return NextResponse.json(
      { error: "Failed to update space", detail: (body as any)?.error },
      { status: 502 },
    );
  }

  return NextResponse.json({ allowList });
}
