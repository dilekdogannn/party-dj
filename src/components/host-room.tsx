"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { hostKey, postJson, useGuestId, useHydrated, useOrigin, useRoom, useStored } from "@/lib/client";
import { QrCode } from "./qr-code";
import { Artwork, TrackRow } from "./track-row";

export function HostRoom({ code }: { code: string }) {
  const hydrated = useHydrated();
  const hostToken = useStored(hostKey(code));
  const guestId = useGuestId();
  const origin = useOrigin();
  const { room, missing } = useRoom(code, guestId);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);

  const nowPlaying = room?.nowPlaying ?? null;
  const currentId = nowPlaying?.id ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentId) return;
    // Browsers refuse to start audio until the user has clicked something on
    // the page; when that happens, show a button instead of staying silent.
    audio.play().then(
      () => setBlocked(false),
      () => setBlocked(true),
    );
  }, [currentId]);

  function next() {
    postJson(`/api/rooms/${code}/next`, { hostToken, currentId }).catch(() => {});
  }

  function remove(entryId: string) {
    fetch(`/api/rooms/${code}/queue/${entryId}`, {
      method: "DELETE",
      headers: { "x-host-token": hostToken ?? "" },
    }).catch(() => {});
  }

  if (!hydrated) return null;

  if (missing || !hostToken) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">
          {missing ? "This party is over" : "You're not hosting this party"}
        </h1>
        <p className="text-white/60">
          {missing
            ? `Room ${code} doesn't exist anymore.`
            : "The host screen only opens on the device that started the room."}
        </p>
        <Link
          href={missing ? "/" : `/room/${code}`}
          className="rounded-full bg-white px-5 py-2 font-medium text-black"
        >
          {missing ? "Start a new one" : "Join as a guest"}
        </Link>
      </main>
    );
  }

  const joinUrl = `${origin}/room/${code}`;

  return (
    <main className="grid flex-1 gap-8 p-6 lg:grid-cols-[1fr_24rem] lg:p-10">
      <section className="flex flex-col items-center justify-center gap-6 text-center">
        {nowPlaying ? (
          <>
            <Artwork track={nowPlaying.track} size={280} />
            <div className="max-w-xl">
              <p className="text-sm uppercase tracking-widest text-fuchsia-300">Now playing</p>
              <h1 className="mt-1 text-4xl font-bold">{nowPlaying.track.title}</h1>
              <p className="mt-1 text-xl text-white/70">{nowPlaying.track.artist}</p>
              <p className="mt-1 text-sm text-white/40">Added by {nowPlaying.addedBy}</p>
            </div>
            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-fuchsia-400" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="flex gap-3">
              {blocked && (
                <button
                  onClick={() => audioRef.current?.play().then(() => setBlocked(false))}
                  className="rounded-full bg-fuchsia-500 px-6 py-2.5 font-semibold hover:bg-fuchsia-400"
                >
                  ▶ Start the music
                </button>
              )}
              <button
                onClick={next}
                className="rounded-full bg-white/10 px-6 py-2.5 font-semibold hover:bg-white/20"
              >
                Skip
              </button>
            </div>
            <audio
              key={nowPlaying.id}
              ref={audioRef}
              src={nowPlaying.track.previewUrl}
              onEnded={next}
              onTimeUpdate={(event) => {
                const audio = event.currentTarget;
                setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
              }}
            />
          </>
        ) : (
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Waiting for the first song</h1>
            <p className="mt-3 text-lg text-white/60">
              Scan the code with your phone and pick something to get the party started.
            </p>
          </div>
        )}
      </section>

      <aside className="flex flex-col gap-6">
        <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4">
          {origin && <QrCode value={joinUrl} className="size-32 shrink-0 rounded-lg" />}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/50">Join with code</p>
            <p className="font-mono text-4xl font-bold tracking-widest">{code}</p>
            <p className="mt-1 truncate text-sm text-white/50">{joinUrl.replace(/^https?:\/\//, "")}</p>
            <p className="mt-1 text-sm text-white/50">{room?.connected ?? 0} connected</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Up next</h2>
          {room && room.queue.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-white/50">
              The queue is empty.
            </p>
          )}
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {room?.queue.map((entry) => (
              <TrackRow
                key={entry.id}
                track={entry.track}
                detail={entry.addedBy}
                action={
                  <>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
                      ▲ {entry.votes}
                    </span>
                    <button
                      onClick={() => remove(entry.id)}
                      aria-label={`Remove ${entry.track.title}`}
                      className="grid size-8 place-items-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
                    >
                      ✕
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
