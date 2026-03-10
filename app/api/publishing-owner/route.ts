import { NextRequest, NextResponse } from "next/server";
import { Client, AtIdentifierString } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as ch from "@/src/lexicons/ch";
import { cleanIPI, isValidIPI, IPI_ERROR_MESSAGE } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const did = request.nextUrl.searchParams.get("did");
    const repoDid = (did || session.did) as AtIdentifierString;

    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    const lexClient = new Client(oauthSession);

    const query = await lexClient.list(ch.indiemusi.alpha.actor.publishingOwner, {
      limit: 10,
      repo: repoDid,
    })

    if (query.records.length > 0) {
      const record = query.records[0];
      console.log("Fetched publishing owner records:", record.value);
      return NextResponse.json({
        success: true,
        publishingOwner: record.value,
        uri: record.uri,
        did: repoDid,
      });
    }

    return NextResponse.json({
      success: true,
      publishingOwner: null,
      did: repoDid,
    });
  } catch (error) {
    console.error("Failed to fetch publishing owner:", error);
    return NextResponse.json(
      { error: "Failed to fetch publishing owner" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { firstName, lastName, companyName, ipi, collectingSociety } = await request.json();

  if (!firstName && !lastName && !companyName) {
    return NextResponse.json(
      { error: "At least one name field is required" },
      { status: 400 }
    );
  }

  // Validate and clean IPI number
  const cleanedIpi = cleanIPI(ipi);
  if (ipi && !isValidIPI(ipi)) {
    return NextResponse.json(
      { error: IPI_ERROR_MESSAGE },
      { status: 400 }
    );
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(session.did);
  const lexClient = new Client(oauthSession);

  const data: any = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (companyName) data.companyName = companyName;
  if (cleanedIpi) data.ipi = cleanedIpi;
  if (collectingSociety) data.collectingSociety = collectingSociety;

  const res = await lexClient.create(ch.indiemusi.alpha.actor.publishingOwner, data);

  return NextResponse.json({
    success: true,
    uri: res.uri,
    publishingOwner: data,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri, firstName, lastName, companyName, ipi, collectingSociety } =
    await request.json();

  if (!uri || typeof uri !== "string") {
    return NextResponse.json({ error: "URI is required" }, { status: 400 });
  }

  if (!firstName && !lastName && !companyName) {
    return NextResponse.json(
      { error: "At least one name field is required" },
      { status: 400 }
    );
  }

  if (ipi && !isValidIPI(ipi)) {
    return NextResponse.json(
      { error: IPI_ERROR_MESSAGE },
      { status: 400 }
    );
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(session.did);
  const lexClient = new Client(oauthSession);

  const data: any = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (companyName) data.companyName = companyName;
  if (ipi) data.ipi = cleanIPI(ipi);
  if (collectingSociety) data.collectingSociety = collectingSociety;

  const uriParts = uri.split("/");
  const rkey = uriParts[uriParts.length - 1];

  await lexClient.put(ch.indiemusi.alpha.actor.publishingOwner, data, { rkey });

  return NextResponse.json({
    success: true,
    uri,
    publishingOwner: data,
  });
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

    await lexClient.delete(ch.indiemusi.alpha.actor.publishingOwner, { rkey });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete publishing owner:", error);
    return NextResponse.json(
      { error: "Failed to delete publishing owner" },
      { status: 500 }
    );
  }
}
