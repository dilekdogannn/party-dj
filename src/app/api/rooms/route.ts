import { createRoom } from "@/lib/rooms";

export async function POST() {
  const room = createRoom();
  return Response.json({ code: room.code, hostToken: room.hostToken }, { status: 201 });
}
