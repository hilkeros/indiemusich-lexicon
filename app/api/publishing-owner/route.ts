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

    const query = await lexClient.list(ch.indiemusi.alpha.actor.publishingOwner, {
      limit: 10,
      repo: session.did,
    })

    if (query.records.length > 0) {
      const record = query.records[0];
      console.log("Fetched publishing owner records:", record.value);
      return NextResponse.json({
        success: true,
        publishingOwner: record.value,
        uri: record.uri,
      });
    }

    return NextResponse.json({
      success: true,
      publishingOwner: null,
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
  let cleanedIpi: string | undefined;
  if (ipi) {
    cleanedIpi = ipi.replace(/\s/g, '');
    
    if (!/^\d{11}$/.test(cleanedIpi)) {
      return NextResponse.json(
        { error: "IPI number must be exactly 11 digits" },
        { status: 400 }
      );
    }
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
