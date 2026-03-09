import { NextRequest, NextResponse } from "next/server";
import { Client } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as ch from "@/src/lexicons/ch";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const records = await lexClient.list(ch.indiemusi.alpha.song, {
      limit: 10,
      repo: session.did,
    })

    if (records.records.length > 0) {
      const record = records.records[0];
      console.log("Fetched song records:", record.value);
      return NextResponse.json({
        success: true,
        song: record.value,
        uri: record.uri,
      });
    }

    return NextResponse.json({
      success: true,
      song: null,
    });
  } catch (error) {
    console.error("Failed to fetch song:", error);
    return NextResponse.json(
      { error: "Failed to fetch song" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, iswc, interestedParties } = await request.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!interestedParties || !Array.isArray(interestedParties) || interestedParties.length === 0) {
    return NextResponse.json(
      { error: "At least one interested party is required" },
      { status: 400 }
    );
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(session.did);
  const lexClient = new Client(oauthSession);

  const createdData: any = { title, interestedParties };
  if (iswc) createdData.iswc = iswc;

  const res = await lexClient.create(ch.indiemusi.alpha.song, createdData);

  return NextResponse.json({
    success: true,
    uri: res.uri,
    song: createdData,
  });
}
