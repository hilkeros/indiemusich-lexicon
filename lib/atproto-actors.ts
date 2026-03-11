export interface ActorResult {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

import { Client, type AtIdentifierString } from "@atproto/lex";

const PUBLIC_ACTOR_API_BASE = "https://public.api.bsky.app/xrpc/app.bsky.actor";

function getAtprotoHandleFromAlsoKnownAs(alsoKnownAs: unknown): string | undefined {
  if (!Array.isArray(alsoKnownAs)) {
    return undefined;
  }

  const aka = alsoKnownAs.find(
    (value): value is string => typeof value === "string" && value.startsWith("at://")
  );

  return aka ? aka.slice(5) : undefined;
}

export function getDidDocumentUrl(did: string): string | null {
  if (did.startsWith("did:plc:")) {
    return `https://plc.directory/${did}`;
  }

  if (did.startsWith("did:web:")) {
    const identifier = did.slice("did:web:".length);
    const segments = identifier.split(":").map((segment) => decodeURIComponent(segment));
    const [host, ...pathParts] = segments;

    if (!host) {
      return null;
    }

    const path = pathParts.length > 0
      ? `/${pathParts.map(encodeURIComponent).join("/")}/did.json`
      : "/.well-known/did.json";

    return `https://${host}${path}`;
  }

  return null;
}

export async function resolvePdsEndpoint(did: string): Promise<string | null> {
  const didDocumentUrl = getDidDocumentUrl(did);
  if (!didDocumentUrl) {
    return null;
  }

  const res = await fetch(didDocumentUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const didDocument = await res.json();
  const services = Array.isArray(didDocument?.service) ? didDocument.service : [];
  const pds = services.find(
    (entry: { type?: unknown; serviceEndpoint?: unknown }) =>
      entry?.type === "AtprotoPersonalDataServer" &&
      typeof entry?.serviceEndpoint === "string",
  );

  return typeof pds?.serviceEndpoint === "string"
    ? pds.serviceEndpoint.replace(/\/$/, "")
    : null;
}

export async function fetchFirstRecordFromRepo(
  collection: {
    $type: string;
    [key: string]: unknown;
  },
  repoDid: string,
): Promise<{ uri: string; value: unknown } | null> {
  const pdsEndpoint = await resolvePdsEndpoint(repoDid);
  if (!pdsEndpoint) {
    return null;
  }

  try {
    const repoClient = new Client(pdsEndpoint);
    const query = await repoClient.list(collection as any, {
      limit: 10,
      repo: repoDid as AtIdentifierString,
    });

    if (query.records.length === 0) {
      return null;
    }

    const record = query.records[0];
    return {
      uri: record.uri,
      value: record.value,
    };
  } catch {
    return null;
  }
}

async function resolveHandleFromDid(did: string): Promise<string | undefined> {
  const documentUrl = getDidDocumentUrl(did);
  if (!documentUrl) {
    return undefined;
  }

  try {
    const res = await fetch(documentUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return undefined;
    }

    const document = await res.json();
    return getAtprotoHandleFromAlsoKnownAs(document?.alsoKnownAs);
  } catch {
    return undefined;
  }
}

function mapActor(actor: any): ActorResult | null {
  if (typeof actor?.did !== "string" || typeof actor?.handle !== "string") {
    return null;
  }

  return {
    did: actor.did,
    handle: actor.handle,
    displayName: typeof actor.displayName === "string" ? actor.displayName : undefined,
    avatar: typeof actor.avatar === "string" ? actor.avatar : undefined,
  };
}

export async function searchActorsTypeahead(query: string, limit = 8): Promise<ActorResult[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const url = `${PUBLIC_ACTOR_API_BASE}/searchActorsTypeahead?q=${encodeURIComponent(q)}&limit=${limit}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return Array.isArray(data.actors)
    ? data.actors
        .map(mapActor)
      .filter((actor: ActorResult | null): actor is ActorResult => actor !== null)
    : [];
}

export async function getActorProfile(actor: string): Promise<ActorResult | null> {
  const value = actor.trim();
  if (!value) {
    return null;
  }

  const resolvedHandle = value.startsWith("did:") ? await resolveHandleFromDid(value) : undefined;
  const profileActor = resolvedHandle || value;

  try {
    const url = `${PUBLIC_ACTOR_API_BASE}/getProfile?actor=${encodeURIComponent(profileActor)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const profile = mapActor(data);
      if (profile) {
        return {
          ...profile,
          did: value.startsWith("did:") ? value : profile.did,
          handle: resolvedHandle || profile.handle,
        };
      }
    }
  } catch {
    // Fallback handled below.
  }

  if (resolvedHandle) {
    return {
      did: value,
      handle: resolvedHandle,
    };
  }

  return null;
}
