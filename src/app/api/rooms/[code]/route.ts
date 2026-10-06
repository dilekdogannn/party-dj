import { jsonError } from "@/lib/http";
import { getRoom, isHost } from "@/lib/rooms";

/** Lets a client check that a room exists and whether its saved token still makes it the host. */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return jsonError("Room not found", 404);

  return Response.json({
    code: room.code,
    isHost: isHost(room, request.headers.get("x-host-token")),
  });
}
