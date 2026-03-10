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

    const records = await lexClient.list(ch.indiemusi.alpha.actor.masterOwner, {
      limit: 10,
      repo: (didParam || session.did) as any,
    })

    if (records.records.length > 0) {
      const record = records.records[0];
      console.log("Fetched master owner records:", record.value);
      return NextResponse.json({
        success: true,
        masterOwner: record.value,
        uri: record.uri,
      });
    }

    return NextResponse.json({
      success: true,
      masterOwner: null,
    });
  } catch (error) {
    console.error("Failed to fetch master owner:", error);
    return NextResponse.json(
      { error: "Failed to fetch master owner" },
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

  const createdData = { name };
  const res = await lexClient.create(ch.indiemusi.alpha.actor.masterOwner, createdData);

  return NextResponse.json({
    success: true,
    uri: res.uri,
    masterOwner: createdData,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri, name } = await request.json();

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

    const updatedData = { name };
    const uriParts = uri.split("/");
    const rkey = uriParts[uriParts.length - 1];

    await lexClient.put(ch.indiemusi.alpha.actor.masterOwner, updatedData, {
      rkey,
    });

    return NextResponse.json({
      success: true,
      uri,
      masterOwner: updatedData,
    });
  } catch (error) {
    console.error("Failed to update master owner:", error);
    return NextResponse.json(
      { error: "Failed to update master owner" },
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

    await lexClient.delete(ch.indiemusi.alpha.actor.masterOwner, { rkey });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete master owner:", error);
    return NextResponse.json(
      { error: "Failed to delete master owner" },
      { status: 500 }
    );
  }
}
