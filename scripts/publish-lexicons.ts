/**
 * Publishes lexicons as com.atproto.lexicon.schema records on the PDS.
 * The PDS uses these records to resolve space type declarations when
 * processing OAuth scope requests like space:ch.indiemusi.alpha.audioTrack.
 *
 * Usage:
 *   LEXICON_AUTHORITY_HANDLE=lexicons.indiemusi.ch \
 *   LEXICON_AUTHORITY_PASSWORD=your-password \
 *   LEXICON_AUTHORITY_PDS=https://spaces-alpha.host.bsky.network \
 *   node --import tsx scripts/publish-lexicons.ts
 */

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const LEXICON_COLLECTION = "com.atproto.lexicon.schema";

type LexiconDoc = {
  lexicon: number;
  id: string;
  defs: Record<string, unknown>;
};

async function loadLexicons(dir: string): Promise<LexiconDoc[]> {
  const docs: LexiconDoc[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) docs.push(...(await loadLexicons(path)));
    if (entry.isFile() && entry.name.endsWith(".json")) {
      docs.push(JSON.parse(await readFile(path, "utf8")) as LexiconDoc);
    }
  }
  return docs;
}

async function xrpc(
  url: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function main() {
  const handle = process.env.LEXICON_AUTHORITY_HANDLE;
  const password = process.env.LEXICON_AUTHORITY_PASSWORD;
  const pds = process.env.LEXICON_AUTHORITY_PDS;

  if (!handle || !password || !pds) {
    throw new Error(
      "Set LEXICON_AUTHORITY_HANDLE, LEXICON_AUTHORITY_PASSWORD, and LEXICON_AUTHORITY_PDS",
    );
  }

  const login = await xrpc(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });

  const accessJwt = String(login.accessJwt);
  const did = String(login.did);
  console.log(`Logged in as ${handle} (${did})`);

  const lexiconDir = join(process.cwd(), "lexicons", "ch");
  const docs = await loadLexicons(lexiconDir);
  console.log(`Found ${docs.length} lexicons`);

  for (const doc of docs) {
    const existingUrl = new URL(`${pds}/xrpc/com.atproto.repo.getRecord`);
    existingUrl.searchParams.set("repo", did);
    existingUrl.searchParams.set("collection", LEXICON_COLLECTION);
    existingUrl.searchParams.set("rkey", doc.id);

    const existingResponse = await fetch(existingUrl.toString(), {
      headers: { authorization: `Bearer ${accessJwt}` },
    });

    if (existingResponse.ok) {
      const existing = (await existingResponse.json()) as { value: unknown };
      if (digest(existing.value) === digest(doc)) {
        console.log(`  unchanged: ${doc.id}`);
        continue;
      }
    }

    await xrpc(`${pds}/xrpc/com.atproto.repo.putRecord`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessJwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        repo: did,
        collection: LEXICON_COLLECTION,
        rkey: doc.id,
        record: doc,
      }),
    });
    console.log(`  published: ${doc.id}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
