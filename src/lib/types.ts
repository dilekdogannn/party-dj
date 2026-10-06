export type Track = {
  id: number;
  title: string;
  artist: string;
  artworkUrl: string;
  previewUrl: string;
  durationMs: number;
};

export type QueueEntry = {
  id: string;
  track: Track;
  addedBy: string;
  votes: number;
  votedByMe: boolean;
};

/** What a single client sees. `votedByMe` is computed per guest, so voter ids never leave the server. */
export type RoomView = {
  code: string;
  nowPlaying: QueueEntry | null;
  queue: QueueEntry[];
  connected: number;
};
