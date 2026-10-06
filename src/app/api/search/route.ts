import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { searchTracks } from "@/lib/itunes";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (term.length < 2) return Response.json({ tracks: [] });

  try {
    return Response.json({ tracks: await searchTracks(term) });
  } catch {
    return jsonError("Music service is unavailable", 502);
  }
}
