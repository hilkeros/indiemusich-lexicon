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

    const records = await lexClient.list(ch.indiemusi.alpha.release, {
      limit: 100,
      repo: session.did,
    });

    return NextResponse.json({
      success: true,
      releases: records.records.map((record: any) => ({
        id: record.uri,
        ...record.value,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, artists, recordings, gtin, releaseDate } = await request.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!artists || !Array.isArray(artists) || artists.length === 0) {
    return NextResponse.json(
      { error: "At least one artist is required" },
      { status: 400 }
    );
  }

  if (!recordings || !Array.isArray(recordings) || recordings.length === 0) {
    return NextResponse.json(
      { error: "At least one recording is required" },
      { status: 400 }
    );
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const createdData: any = {
      title,
      artists: artists.map((a: any) => ({
        name: a.name,
        ...(a.did && { did: a.did }),
        ...(a.artist && { artist: a.artist }),
      })),
      recordings: recordings.map((r: any) => {
        const { id: _id, ...recordingRecord } = r || {};
        return {
          ...recordingRecord,
          $type: "ch.indiemusi.alpha.recording",
        };
      }),
    };

    if (gtin) createdData.gtin = gtin;
    if (releaseDate) createdData.releaseDate = releaseDate;

    const res = await lexClient.create(ch.indiemusi.alpha.release, createdData);

    return NextResponse.json({
      success: true,
      uri: res.uri,
      release: createdData,
    });
  } catch (error) {
    console.error("Failed to create release:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create release" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri, title, artists, recordings, gtin, releaseDate } = await request.json();

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

  if (!recordings || !Array.isArray(recordings) || recordings.length === 0) {
    return NextResponse.json(
      { error: "At least one recording is required" },
      { status: 400 }
    );
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const updatedData: any = {
      title,
      artists: artists.map((a: any) => ({
        name: a.name,
        ...(a.did && { did: a.did }),
        ...(a.artist && { artist: a.artist }),
      })),
      recordings: recordings.map((r: any) => {
        const { id: _id, ...recordingRecord } = r || {};
        return {
          ...recordingRecord,
          $type: "ch.indiemusi.alpha.recording",
        };
      }),
    };

    if (gtin) updatedData.gtin = gtin;
    if (releaseDate) updatedData.releaseDate = releaseDate;

    const uriParts = uri.split("/");
    const rkey = uriParts[uriParts.length - 1];

    await lexClient.put(ch.indiemusi.alpha.release, updatedData, { rkey });

    return NextResponse.json({
      success: true,
      uri,
      release: updatedData,
    });
  } catch (error) {
    console.error("Failed to update release:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update release" },
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

    await lexClient.delete(ch.indiemusi.alpha.release, { rkey });

    return NextResponse.json({
      success: true,
      uri,
    });
  } catch (error) {
    console.error("Failed to delete release:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete release" },
      { status: 500 }
    );
  }
}
