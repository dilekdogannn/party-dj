export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Parses a JSON object body, or returns null when the body is missing or malformed. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function asGuestId(value: unknown): string | null {
  return typeof value === "string" && /^[\w-]{8,64}$/.test(value) ? value : null;
}

export function asName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().slice(0, 24) : "";
  return name || "Guest";
}
