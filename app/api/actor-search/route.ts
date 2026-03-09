import { NextRequest, NextResponse } from "next/server";

interface ActorResult {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ success: true, actors: [] as ActorResult[] });
  }

  try {
    const url = `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(q)}&limit=8`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, actors: [] as ActorResult[] });
    }

    const data = await res.json();
    const actors = Array.isArray(data.actors)
      ? data.actors
          .filter((actor: any) => typeof actor?.did === "string" && typeof actor?.handle === "string")
          .map((actor: any) => ({
            did: actor.did,
            handle: actor.handle,
            displayName: typeof actor.displayName === "string" ? actor.displayName : undefined,
            avatar: typeof actor.avatar === "string" ? actor.avatar : undefined,
          }))
      : [];

    return NextResponse.json({ success: true, actors });
  } catch (error) {
    console.error("Failed to search actors:", error);
    return NextResponse.json({ success: true, actors: [] as ActorResult[] });
  }
}
