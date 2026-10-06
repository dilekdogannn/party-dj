"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { postJson, useGuestId, useGuestName, useRoom } from "@/lib/client";
import type { Track } from "@/lib/types";
import { Artwork, TrackRow } from "./track-row";

type SearchResult = { term: string; tracks: Track[]; failed: boolean };

const ADD_MESSAGES: Record<string, string> = {
  added: "Added to the queue",
  upvoted: "Already in the queue — your vote was counted",
  "already-playing": "That one is playing right now",
};

export function GuestRoom({ code }: { code: string }) {
  const guestId = useGuestId();
  const [name, setName] = useGuestName();
  const { room, missing } = useRoom(code, guestId);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return;

    const controller = new AbortController();
    // Wait until typing pauses so every keystroke doesn't hit the music API.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        setResult({ term, tracks: body.tracks ?? [], failed: !response.ok });
      } catch {
        if (!controller.signal.aborted) setResult({ term, tracks: [], failed: true });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function add(track: Track) {
    try {
      const { result: outcome } = await postJson<{ result: string }>(`/api/rooms/${code}/queue`, {
        trackId: track.id,
        guestId,
        name,
      });
      setNotice(ADD_MESSAGES[outcome] ?? "Done");
      setQuery("");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  async function vote(entryId: string) {
    try {
      await postJson(`/api/rooms/${code}/queue/${entryId}/vote`, { guestId });
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  if (missing) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">This party is over</h1>
        <p className="text-white/60">Room {code} doesn&apos;t exist anymore.</p>
        <Link href="/" className="rounded-full bg-white px-5 py-2 font-medium text-black">
          Start a new one
        </Link>
      </main>
    );
  }

  const searching = term.length >= 2;
  const current = searching && result?.term === term ? result : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">Room</p>
          <p className="font-mono text-2xl font-bold tracking-widest">{code}</p>
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={24}
          aria-label="Your name"
          className="w-36 rounded-full bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-fuchsia-400"
        />
      </header>

      {room?.nowPlaying && (
        <section className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-fuchsia-600/40 to-violet-600/40 p-3">
          <Artwork track={room.nowPlaying.track} size={64} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/70">Now playing</p>
            <p className="truncate text-lg font-semibold">{room.nowPlaying.track.title}</p>
            <p className="truncate text-sm text-white/70">{room.nowPlaying.track.artist}</p>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a song or artist"
          aria-label="Search for a song or artist"
          className="rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-fuchsia-400"
        />
        {searching && !current && <p className="px-1 text-sm text-white/50">Searching…</p>}
        {current?.failed && (
          <p className="px-1 text-sm text-red-300">Search isn&apos;t working right now. Try again.</p>
        )}
        {current && !current.failed && current.tracks.length === 0 && (
          <p className="px-1 text-sm text-white/50">No songs found for “{term}”.</p>
        )}
        {current && current.tracks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {current.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                action={
                  <button
                    onClick={() => add(track)}
                    className="rounded-full bg-fuchsia-500 px-4 py-1.5 text-sm font-semibold hover:bg-fuchsia-400"
                  >
                    Add
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      {!searching && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-baseline justify-between text-sm font-semibold uppercase tracking-widest text-white/50">
            Up next
            {room && <span className="normal-case tracking-normal">{room.connected} connected</span>}
          </h2>
          {!room && <p className="text-white/50">Connecting…</p>}
          {room && room.queue.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-white/50">
              {room.nowPlaying ? "Nothing queued yet." : "The queue is empty."} Search above to add a
              song.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {room?.queue.map((entry) => (
              <TrackRow
                key={entry.id}
                track={entry.track}
                detail={entry.addedBy}
                action={
                  <button
                    onClick={() => vote(entry.id)}
                    aria-pressed={entry.votedByMe}
                    aria-label={`Vote for ${entry.track.title}`}
                    className={`flex min-w-14 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      entry.votedByMe ? "bg-fuchsia-500" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <span aria-hidden>▲</span>
                    {entry.votes}
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {notice && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-6 mx-auto max-w-md rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black shadow-xl"
        >
          {notice}
        </p>
      )}
    </main>
  );
}
