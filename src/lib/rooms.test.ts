import { describe, expect, it, vi } from "vitest";
import {
  addTrack,
  advance,
  createRoom,
  getRoom,
  isHost,
  removeEntry,
  subscribe,
  toggleVote,
  viewRoom,
} from "./rooms";
import type { Track } from "./types";

function track(id: number): Track {
  return {
    id,
    title: `Song ${id}`,
    artist: "Artist",
    artworkUrl: "",
    previewUrl: `https://example.com/${id}.m4a`,
    durationMs: 30_000,
  };
}

/** A room that is already playing track 1, so new tracks land in the queue. */
function playingRoom() {
  const room = createRoom();
  addTrack(room, track(1), "guest-one", "One");
  return room;
}

const titles = (room: ReturnType<typeof createRoom>) =>
  viewRoom(room, "").queue.map((entry) => entry.track.title);

describe("rooms", () => {
  it("creates rooms with unique four-character codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => createRoom().code));
    expect(codes.size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
  });

  it("finds a room regardless of letter case", () => {
    const room = createRoom();
    expect(getRoom(room.code.toLowerCase())).toBe(room);
  });

  it("accepts only the real host token", () => {
    const room = createRoom();
    expect(isHost(room, room.hostToken)).toBe(true);
    expect(isHost(room, "nope")).toBe(false);
    expect(isHost(room, undefined)).toBe(false);
  });
});

describe("adding tracks", () => {
  it("plays the first track straight away instead of queueing it", () => {
    const room = createRoom();
    expect(addTrack(room, track(1), "guest-one", "One")).toBe("added");

    const view = viewRoom(room, "guest-one");
    expect(view.nowPlaying?.track.id).toBe(1);
    expect(view.queue).toEqual([]);
  });

  it("gives the track its first vote from whoever added it", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-two", "Two");

    expect(viewRoom(room, "guest-two").queue[0]).toMatchObject({ votes: 1, votedByMe: true });
    expect(viewRoom(room, "guest-one").queue[0]).toMatchObject({ votes: 1, votedByMe: false });
  });

  it("counts a repeat request as a vote instead of a duplicate", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-one", "One");

    expect(addTrack(room, track(2), "guest-two", "Two")).toBe("upvoted");
    expect(viewRoom(room, "").queue).toHaveLength(1);
    expect(viewRoom(room, "").queue[0].votes).toBe(2);
  });

  it("refuses the track that is playing right now", () => {
    const room = playingRoom();
    expect(addTrack(room, track(1), "guest-two", "Two")).toBe("already-playing");
  });

  it("stops accepting tracks when the queue is full", () => {
    const room = playingRoom();
    for (let id = 2; id <= 101; id++) addTrack(room, track(id), "guest-one", "One");

    expect(addTrack(room, track(999), "guest-one", "One")).toBe("queue-full");
  });
});

describe("voting", () => {
  it("orders the queue by votes, then by who was added first", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-one", "One");
    addTrack(room, track(3), "guest-one", "One");
    addTrack(room, track(4), "guest-one", "One");
    const [, , fourth] = viewRoom(room, "").queue;

    toggleVote(room, fourth.id, "guest-two");

    expect(titles(room)).toEqual(["Song 4", "Song 2", "Song 3"]);
  });

  it("removes the vote when the same guest votes again", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-one", "One");
    const [entry] = viewRoom(room, "").queue;

    toggleVote(room, entry.id, "guest-two");
    toggleVote(room, entry.id, "guest-two");

    expect(viewRoom(room, "guest-two").queue[0]).toMatchObject({ votes: 1, votedByMe: false });
  });

  it("reports when the track is gone", () => {
    expect(toggleVote(playingRoom(), "missing", "guest-one")).toBe(false);
  });
});

describe("advancing", () => {
  it("plays the top-voted track next", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-one", "One");
    addTrack(room, track(3), "guest-one", "One");
    toggleVote(room, viewRoom(room, "").queue[1].id, "guest-two");

    expect(advance(room, room.nowPlaying!.id)).toBe(true);

    expect(room.nowPlaying?.track.id).toBe(3);
    expect(titles(room)).toEqual(["Song 2"]);
  });

  it("ignores a skip for a track that already finished", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-one", "One");
    addTrack(room, track(3), "guest-one", "One");
    const finished = room.nowPlaying!.id;

    advance(room, finished);
    expect(advance(room, finished)).toBe(false);

    expect(room.nowPlaying?.track.id).toBe(2);
  });

  it("stops playing when the queue runs out", () => {
    const room = playingRoom();
    advance(room, room.nowPlaying!.id);
    expect(room.nowPlaying).toBeNull();
  });
});

describe("removing tracks", () => {
  it("takes a track out of the queue", () => {
    const room = playingRoom();
    addTrack(room, track(2), "guest-one", "One");
    addTrack(room, track(3), "guest-one", "One");

    expect(removeEntry(room, viewRoom(room, "").queue[0].id)).toBe(true);
    expect(titles(room)).toEqual(["Song 3"]);
  });

  it("reports when the track is gone", () => {
    expect(removeEntry(playingRoom(), "missing")).toBe(false);
  });
});

describe("subscribers", () => {
  it("are notified on every change until they unsubscribe", () => {
    const room = playingRoom();
    const notify = vi.fn();
    const unsubscribe = subscribe(room, notify);
    notify.mockClear();

    addTrack(room, track(2), "guest-one", "One");
    toggleVote(room, viewRoom(room, "").queue[0].id, "guest-two");
    expect(notify).toHaveBeenCalledTimes(2);

    unsubscribe();
    notify.mockClear();
    addTrack(room, track(3), "guest-one", "One");
    expect(notify).not.toHaveBeenCalled();
  });

  it("are counted as connected clients", () => {
    const room = createRoom();
    const unsubscribe = subscribe(room, () => {});
    expect(viewRoom(room, "").connected).toBe(1);

    unsubscribe();
    expect(viewRoom(room, "").connected).toBe(0);
  });
});
