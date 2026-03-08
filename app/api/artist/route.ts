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
    const query = await lexClient.list(ch.indiemusi.alpha.actor.artist, {
    limit: 10,
    repo: session.did,
  })

    if (query.records.length > 0) {
      const record = query.records[0];
      console.log("Fetched artist records:", record.value);
      return NextResponse.json({
        success: true,
        artist: record.value,
        uri: record.uri,
      });
    }

    return NextResponse.json({
      success: true,
      artist: null,
    });
  } catch (error) {
    console.error("Failed to fetch artist:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { name } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(session.did);
  const lexClient = new Client(oauthSession);

  const createdAt = new Date().toISOString();
  const res = await lexClient.create(ch.indiemusi.alpha.actor.artist, {
    name,
    createdAt,
  });

  return NextResponse.json({
    success: true,
    uri: res.uri,
  });
}
