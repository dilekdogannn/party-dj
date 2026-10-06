import type { Track } from "./types";

// The iTunes Search API needs no key and returns a 30 second preview per song.
const API = "https://itunes.apple.com";

type ItunesSong = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
};

function toTrack(song: ItunesSong): Track | null {
  if (song.kind !== "song" || !song.trackId || !song.trackName || !song.previewUrl) return null;
  return {
    id: song.trackId,
    title: song.trackName,
    artist: song.artistName ?? "Unknown artist",
    artworkUrl: (song.artworkUrl100 ?? "").replace("100x100", "300x300"),
    previewUrl: song.previewUrl,
    durationMs: song.trackTimeMillis ?? 0,
  };
}

async function fetchSongs(url: URL): Promise<Track[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`iTunes responded with ${response.status}`);
  const body = (await response.json()) as { results?: ItunesSong[] };
  return (body.results ?? []).map(toTrack).filter((track) => track !== null);
}

export function searchTracks(term: string): Promise<Track[]> {
  const url = new URL("/search", API);
  url.searchParams.set("term", term);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "15");
  return fetchSongs(url);
}

export async function lookupTrack(id: number): Promise<Track | null> {
  const url = new URL("/lookup", API);
  url.searchParams.set("id", String(id));
  const [track] = await fetchSongs(url);
  return track ?? null;
}
