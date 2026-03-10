import { NextRequest, NextResponse } from "next/server";
import { Client } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as ch from "@/src/lexicons/ch";
import { isValidIPI, IPI_ERROR_MESSAGE } from "@/lib/validation";

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
      limit: 100,
      repo: session.did,
    });

    // Return all songs as an array
    return NextResponse.json({
      success: true,
      songs: records.records.map((record: any) => ({
        id: record.uri,
        ...record.value,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
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

  // Validate IPI numbers for all interested parties
  for (const party of interestedParties) {
    if (party.ipi && !isValidIPI(party.ipi)) {
      return NextResponse.json(
        { error: `${IPI_ERROR_MESSAGE} for ${party.name || 'interested party'}` },
        { status: 400 }
      );
    }
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

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri, title, iswc, interestedParties } = await request.json();

  if (!uri || typeof uri !== "string") {
    return NextResponse.json({ error: "URI is required" }, { status: 400 });
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!interestedParties || !Array.isArray(interestedParties) || interestedParties.length === 0) {
    return NextResponse.json(
      { error: "At least one interested party is required" },
      { status: 400 }
    );
  }

  // Validate IPI numbers for all interested parties
  for (const party of interestedParties) {
    if (party.ipi && !isValidIPI(party.ipi)) {
      return NextResponse.json(
        { error: `${IPI_ERROR_MESSAGE} for ${party.name || 'interested party'}` },
        { status: 400 }
      );
    }
  }

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const updatedData: any = { title, interestedParties };
    if (iswc) updatedData.iswc = iswc;

    // Parse URI to get rkey
    const uriParts = uri.split('/');
    const rkey = uriParts[uriParts.length - 1];

    await lexClient.put(ch.indiemusi.alpha.song, updatedData, { rkey });

    return NextResponse.json({
      success: true,
      uri,
      song: updatedData,
    });
  } catch (error) {
    console.error("Failed to update song:", error);
    return NextResponse.json(
      { error: "Failed to update song" },
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

    await lexClient.delete(ch.indiemusi.alpha.song, { rkey });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete song:", error);
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    );
  }
}
