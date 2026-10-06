import { asGuestId, jsonError, readBody } from "@/lib/http";
import { getRoom, toggleVote } from "@/lib/rooms";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/queue/[entryId]/vote">,
) {
  const { code, entryId } = await ctx.params;
  const room = getRoom(code);
  if (!room) return jsonError("Room not found", 404);

  const guestId = asGuestId((await readBody(request))?.guestId);
  if (!guestId) return jsonError("Invalid request", 400);

  if (!toggleVote(room, entryId, guestId)) return jsonError("Track is no longer in the queue", 404);
  return Response.json({ ok: true });
}
