import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { getRoom, subscribe, viewRoom } from "@/lib/rooms";

const KEEP_ALIVE_MS = 25_000;

/**
 * Server-Sent Events stream. Every client keeps one of these open and receives
 * the full room state whenever anything changes.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/rooms/[code]/events">) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return jsonError("Room not found", 404);

  const guestId = request.nextUrl.searchParams.get("guest") ?? "";
  const encoder = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The client went away between the change and this write.
          stop();
        }
      };
      const sendState = () => write(`data: ${JSON.stringify(viewRoom(room, guestId))}\n\n`);

      // Proxies drop idle connections, so send a comment line now and then.
      const keepAlive = setInterval(() => write(": keep-alive\n\n"), KEEP_ALIVE_MS);
      const unsubscribe = subscribe(room, sendState);

      stop = () => {
        stop = () => {};
        clearInterval(keepAlive);
        unsubscribe();
      };
      request.signal.addEventListener("abort", () => stop());
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
