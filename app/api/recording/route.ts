import { NextRequest, NextResponse } from "next/server";
import { Client } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import { cleanISRC, isValidISRC, ISRC_ERROR_MESSAGE } from "@/lib/validation";
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

    const records = await lexClient.list(ch.indiemusi.alpha.recording, {
      limit: 100,
      repo: session.did,
    });

    const songs = await lexClient.list(ch.indiemusi.alpha.song, {
      limit: 100,
      repo: session.did,
    });

    const songTitleByRef = new Map<string, string>();
    songs.records.forEach((record: any) => {
      if (record?.uri && typeof record?.value?.title === "string") {
        songTitleByRef.set(record.uri, record.value.title);
      }
    });

    return NextResponse.json({
      success: true,
      recordings: records.records.map((record: any) => ({
        id: record.uri,
        ...record.value,
        ...(record.value?.song?.ref
          ? {
              song: {
                ...record.value.song,
                ...(songTitleByRef.get(record.value.song.ref)
                  ? { title: songTitleByRef.get(record.value.song.ref) }
                  : {}),
              },
            }
          : {}),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch recordings:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, song, artists, isrc, masterOwner, duration } = await request.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!artists || !Array.isArray(artists) || artists.length === 0) {
    return NextResponse.json(
      { error: "At least one artist is required" },
      { status: 400 }
    );
  }

  if (isrc && !isValidISRC(isrc)) {
    return NextResponse.json({ error: ISRC_ERROR_MESSAGE }, { status: 400 });
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(session.did);
  const lexClient = new Client(oauthSession);

  const createdData: any = { title, artists };
  if (song) createdData.song = song;
  if (isrc) createdData.isrc = cleanISRC(isrc);
  if (masterOwner) createdData.masterOwner = masterOwner;
  if (duration != null) createdData.duration = parseInt(duration, 10);

  const res = await lexClient.create(ch.indiemusi.alpha.recording, createdData);

  return NextResponse.json({
    success: true,
    uri: res.uri,
    recording: createdData,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri, title, song, artists, isrc, masterOwner, duration } = await request.json();

  if (!uri || typeof uri !== "string") {
    return NextResponse.json({ error: "URI is required" }, { status: 400 });
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!artists || !Array.isArray(artists) || artists.length === 0) {
    return NextResponse.json(
      { error: "At least one artist is required" },
      { status: 400 }
    );
  }

  if (isrc && !isValidISRC(isrc)) {
    return NextResponse.json({ error: ISRC_ERROR_MESSAGE }, { status: 400 });
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const uriParts = uri.split("/");
    const rkey = uriParts[uriParts.length - 1];

    const existing = await lexClient.get(ch.indiemusi.alpha.recording, { repo: session.did, rkey });
    const existingValue = (existing as any)?.value ?? {};

    const updatedData: any = { title, artists };
    if (song) updatedData.song = song;
    if (isrc) updatedData.isrc = cleanISRC(isrc);
    if (masterOwner) updatedData.masterOwner = masterOwner;
    if (duration != null) updatedData.duration = parseInt(duration, 10);
    if (existingValue.audioFile) updatedData.audioFile = existingValue.audioFile;

    await lexClient.put(ch.indiemusi.alpha.recording, updatedData, { rkey });

    return NextResponse.json({
      success: true,
      uri,
      recording: updatedData,
    });
  } catch (error) {
    console.error("Failed to update recording:", error);
    return NextResponse.json(
      { error: "Failed to update recording" },
      { status: 500 }
    );
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

    const uriParts = uri.split("/");
    const rkey = uriParts[uriParts.length - 1];

    await lexClient.delete(ch.indiemusi.alpha.recording, { rkey });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete recording:", error);
    return NextResponse.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    );
  }
}
