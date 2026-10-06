import { asGuestId, asName, jsonError, readBody } from "@/lib/http";
import { lookupTrack } from "@/lib/itunes";
import { addTrack, getRoom } from "@/lib/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/queue">) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return jsonError("Room not found", 404);

  const body = await readBody(request);
  const guestId = asGuestId(body?.guestId);
  const trackId = body?.trackId;
  if (!guestId || typeof trackId !== "number" || !Number.isSafeInteger(trackId)) {
    return jsonError("Invalid request", 400);
  }

  // Only the id comes from the client; title, artist and audio URL are fetched
  // here so nobody can queue made-up tracks or arbitrary audio.
  let track;
  try {
    track = await lookupTrack(trackId);
  } catch {
    return jsonError("Music service is unavailable", 502);
  }
  if (!track) return jsonError("Track not found", 404);

  const result = addTrack(room, track, guestId, asName(body?.name));
  if (result === "queue-full") return jsonError("The queue is full", 409);
  return Response.json({ result });
}
