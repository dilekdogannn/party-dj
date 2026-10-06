import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { QueueEntry, RoomView, Track } from "./types";

type Entry = {
  id: string;
  track: Track;
  addedBy: string;
  addedAt: number;
  voters: Set<string>;
};

export type Room = {
  code: string;
  hostToken: string;
  nowPlaying: Entry | null;
  queue: Entry[];
  subscribers: Set<() => void>;
  touchedAt: number;
};

const MAX_QUEUE = 100;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
// No I, O, 0 or 1: codes get read aloud and typed on phones.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Rooms live in memory. Keeping the map on globalThis lets every route handler
// (and every hot reload in development) share the same instance.
const globalStore = globalThis as typeof globalThis & {
  __partyDjRooms?: Map<string, Room>;
};
const rooms = (globalStore.__partyDjRooms ??= new Map<string, Room>());

function newCode(): string {
  const bytes = randomBytes(4);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function sweepExpired(now: number) {
  for (const [code, room] of rooms) {
    if (room.subscribers.size === 0 && now - room.touchedAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

function changed(room: Room) {
  room.touchedAt = Date.now();
  for (const notify of room.subscribers) notify();
}

/** Most votes first; ties go to whoever was added earlier. */
function byRank(a: Entry, b: Entry) {
  return b.voters.size - a.voters.size || a.addedAt - b.addedAt;
}

export function createRoom(): Room {
  const now = Date.now();
  sweepExpired(now);

  let code = newCode();
  while (rooms.has(code)) code = newCode();

  const room: Room = {
    code,
    hostToken: randomBytes(24).toString("base64url"),
    nowPlaying: null,
    queue: [],
    subscribers: new Set(),
    touchedAt: now,
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function isHost(room: Room, token: unknown): boolean {
  if (typeof token !== "string") return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(room.hostToken);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function viewRoom(room: Room, guestId: string): RoomView {
  const view = (entry: Entry): QueueEntry => ({
    id: entry.id,
    track: entry.track,
    addedBy: entry.addedBy,
    votes: entry.voters.size,
    votedByMe: entry.voters.has(guestId),
  });
  return {
    code: room.code,
    nowPlaying: room.nowPlaying && view(room.nowPlaying),
    queue: [...room.queue].sort(byRank).map(view),
    connected: room.subscribers.size,
  };
}

export function subscribe(room: Room, notify: () => void): () => void {
  room.subscribers.add(notify);
  changed(room);
  return () => {
    room.subscribers.delete(notify);
    changed(room);
  };
}

export type AddResult = "added" | "upvoted" | "already-playing" | "queue-full";

export function addTrack(room: Room, track: Track, guestId: string, addedBy: string): AddResult {
  if (room.nowPlaying?.track.id === track.id) return "already-playing";

  // Requesting a song that is already queued counts as a vote for it.
  const existing = room.queue.find((entry) => entry.track.id === track.id);
  if (existing) {
    existing.voters.add(guestId);
    changed(room);
    return "upvoted";
  }

  if (room.queue.length >= MAX_QUEUE) return "queue-full";

  const entry: Entry = {
    id: randomUUID(),
    track,
    addedBy,
    addedAt: Date.now(),
    voters: new Set([guestId]),
  };
  if (room.nowPlaying) room.queue.push(entry);
  else room.nowPlaying = entry;

  changed(room);
  return "added";
}

export function toggleVote(room: Room, entryId: string, guestId: string): boolean {
  const entry = room.queue.find((candidate) => candidate.id === entryId);
  if (!entry) return false;

  if (!entry.voters.delete(guestId)) entry.voters.add(guestId);
  changed(room);
  return true;
}

export function removeEntry(room: Room, entryId: string): boolean {
  const remaining = room.queue.filter((entry) => entry.id !== entryId);
  if (remaining.length === room.queue.length) return false;

  room.queue = remaining;
  changed(room);
  return true;
}

/**
 * Moves on to the top-voted track. The caller says which track it thinks is
 * playing, so a double click or a late "song ended" event can't skip twice.
 */
export function advance(room: Room, currentId: string | null): boolean {
  if ((room.nowPlaying?.id ?? null) !== currentId) return false;

  const next = [...room.queue].sort(byRank)[0] ?? null;
  room.queue = room.queue.filter((entry) => entry !== next);
  room.nowPlaying = next;
  changed(room);
  return true;
}
