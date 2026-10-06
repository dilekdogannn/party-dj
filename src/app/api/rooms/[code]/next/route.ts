import { jsonError, readBody } from "@/lib/http";
import { advance, getRoom, isHost } from "@/lib/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/next">) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return jsonError("Room not found", 404);

  const body = await readBody(request);
  if (!isHost(room, body?.hostToken)) return jsonError("Only the host can skip tracks", 403);

  const currentId = typeof body?.currentId === "string" ? body.currentId : null;
  return Response.json({ advanced: advance(room, currentId) });
}
