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

  const didParam = request.nextUrl.searchParams.get("did");

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const repo = (didParam || session.did) as any;
    const records = await lexClient.list(ch.indiemusi.alpha.actor.artist, {
      limit: 10,
      repo,
    });

    if (records.records.length > 0) {
      const record = records.records[0];
      const artist = {
        ...(record.value || {}),
        $type: record.value?.$type || "ch.indiemusi.alpha.actor.artist",
      };
      return NextResponse.json({
        success: true,
        artist,
        uri: record.uri,
      });
    }

    return NextResponse.json({
      success: true,
      artist: null,
      uri: null,
    });
  } catch (error) {
    console.error("Failed to fetch artist:", error);
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
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
  const createdData = {
    name,
    createdAt,
  };

  const res = await lexClient.create(ch.indiemusi.alpha.actor.artist, createdData);

  return NextResponse.json({
    success: true,
    uri: res.uri,
    artist: createdData,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri, name, createdAt } = await request.json();

  if (!uri || typeof uri !== "string") {
    return NextResponse.json({ error: "URI is required" }, { status: 400 });
  }

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const updatedData = {
      name,
      createdAt:
        typeof createdAt === "string" && createdAt.length > 0
          ? createdAt
          : new Date().toISOString(),
    };

    await lexClient.put(ch.indiemusi.alpha.actor.artist, updatedData, {
      rkey: "self",
    });

    return NextResponse.json({
      success: true,
      uri,
      artist: updatedData,
    });
  } catch (error) {
    console.error("Failed to update artist:", error);
    return NextResponse.json({ error: "Failed to update artist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri } = await request.json();

  if (!uri || typeof uri !== "string") {
    return NextResponse.json({ error: "URI is required" }, { status: 400 });
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    await lexClient.delete(ch.indiemusi.alpha.actor.artist, {
      rkey: "self",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete artist:", error);
    return NextResponse.json({ error: "Failed to delete artist" }, { status: 500 });
  }
}
