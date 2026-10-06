import { jsonError } from "@/lib/http";
import { getRoom, isHost, removeEntry } from "@/lib/rooms";

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/queue/[entryId]">,
) {
  const { code, entryId } = await ctx.params;
  const room = getRoom(code);
  if (!room) return jsonError("Room not found", 404);

  if (!isHost(room, request.headers.get("x-host-token"))) {
    return jsonError("Only the host can remove tracks", 403);
  }

  if (!removeEntry(room, entryId)) return jsonError("Track is no longer in the queue", 404);
  return Response.json({ ok: true });
}
