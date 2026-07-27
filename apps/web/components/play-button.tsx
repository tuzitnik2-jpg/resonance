"use client";

import { usePlayer, type PlayerTrack } from "./player-provider";

/** The round play/pause button that appears on song media cards. */
export function PlayFab({ track }: { track: PlayerTrack }) {
  const player = usePlayer();
  const isCurrent = player.current?.id === track.id;
  const isPlaying = isCurrent && player.playing;
  const isLoading = isCurrent && player.loading;

  return (
    <button
      type="button"
      className="play-fab"
      aria-label={isPlaying ? "Pause preview" : "Play preview"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        player.play(track);
      }}
    >
      {isLoading ? "◌" : isPlaying ? "❚❚" : "▸"}
    </button>
  );
}
