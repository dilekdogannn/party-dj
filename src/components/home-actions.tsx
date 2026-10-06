"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hostKey, postJson, setStored } from "@/lib/client";

export function HomeActions() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startParty() {
    setCreating(true);
    setError(null);
    try {
      const room = await postJson<{ code: string; hostToken: string }>("/api/rooms");
      // The token proves this browser is the host; it never appears in a URL.
      setStored(hostKey(room.code), room.hostToken);
      router.push(`/room/${room.code}/host`);
    } catch (cause) {
      setError((cause as Error).message);
      setCreating(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <button
        onClick={startParty}
        disabled={creating}
        className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-4 text-lg font-semibold shadow-lg shadow-fuchsia-500/20 hover:brightness-110 disabled:opacity-60"
      >
        {creating ? "Starting…" : "Start a party"}
      </button>
      {error && <p className="text-center text-sm text-red-300">{error}</p>}

      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="h-px flex-1 bg-white/10" />
        or join one
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === 4) router.push(`/room/${code}`);
        }}
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="CODE"
          maxLength={4}
          aria-label="Room code"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full bg-white/10 px-5 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none placeholder:text-white/30 focus:ring-2 focus:ring-fuchsia-400"
        />
        <button
          type="submit"
          disabled={code.length !== 4}
          className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
        >
          Join
        </button>
      </form>
    </div>
  );
}
