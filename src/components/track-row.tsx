import Image from "next/image";
import type { ReactNode } from "react";
import type { Track } from "@/lib/types";

export function Artwork({ track, size }: { track: Track; size: number }) {
  return track.artworkUrl ? (
    <Image
      src={track.artworkUrl}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-lg bg-white/5 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div className="shrink-0 rounded-lg bg-white/5" style={{ width: size, height: size }} />
  );
}

export function TrackRow({
  track,
  detail,
  action,
}: {
  track: Track;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/5 p-2 pr-3">
      <Artwork track={track} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-sm text-white/60">
          {track.artist}
          {detail && <span className="text-white/40"> · {detail}</span>}
        </p>
      </div>
      {action}
    </li>
  );
}
