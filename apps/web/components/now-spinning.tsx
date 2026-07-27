"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listSongs, type Song } from "@/lib/api-client";
import { usePlayer } from "./player-provider";

/**
 * The bottom "Now Spinning" bar — a real mini-player. It surfaces a random track from the library
 * and can play its 30-second preview; the shuffle button picks (and plays) another. When something
 * is playing, it reflects the player's current track.
 */
export function NowSpinning() {
  const player = usePlayer();
  const [pool, setPool] = useState<Song[]>([]);
  const [pick, setPick] = useState<Song | null>(null);

  function shuffle(songs: Song[], andPlay: boolean) {
    if (songs.length === 0) return;
    const next = songs[Math.floor(Math.random() * songs.length)];
    setPick(next);
    if (andPlay && next.primaryArtist) {
      player.play({ id: next.id, title: next.title, artist: next.primaryArtist.canonicalName });
    }
  }

  useEffect(() => {
    let cancelled = false;
    listSongs({})
      .then((page) => {
        if (cancelled) return;
        setPool(page.items);
        shuffle(page.items, false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefer whatever is actually playing; fall back to the shuffled pick.
  const shown = player.current
    ? { id: player.current.id, title: player.current.title, artist: player.current.artist }
    : pick
      ? {
          id: pick.id,
          title: pick.title,
          artist: pick.primaryArtist?.canonicalName ?? "—",
        }
      : null;

  const isPlaying = player.playing;

  function handleMainButton() {
    if (player.current) {
      player.toggle();
    } else if (pick?.primaryArtist) {
      player.play({ id: pick.id, title: pick.title, artist: pick.primaryArtist.canonicalName });
    }
  }

  return (
    <div className="playbar">
      <div className="playbar-track">
        <div className={`playbar-art tile-mixed${isPlaying ? " vinyl-spin" : ""}`} aria-hidden>
          ♫
        </div>
        <div className="playbar-meta">
          {shown ? (
            <>
              <Link href={`/songs/${shown.id}`} className="playbar-title">
                {shown.title}
              </Link>
              <div className="playbar-sub">
                {shown.artist}
                {player.loading ? " · loading…" : player.unavailable ? " · no preview" : ""}
              </div>
            </>
          ) : (
            <>
              <div className="playbar-title">Resonance</div>
              <div className="playbar-sub">Your personal music archive</div>
            </>
          )}
        </div>
      </div>

      <div className="playbar-center">
        <span className="playbar-label">Now Spinning</span>
        <button
          className="playbar-spin"
          onClick={handleMainButton}
          disabled={!shown}
          title={isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause" : "Play preview"}
        >
          {isPlaying ? "❚❚" : "▸"}
        </button>
        <button
          className="playbar-shuffle"
          onClick={() => shuffle(pool, true)}
          disabled={pool.length === 0}
          title="Spin another"
          aria-label="Spin a different track"
        >
          ⟳
        </button>
      </div>

      <div className="playbar-end">
        {shown && (
          <Link href={`/songs/${shown.id}`} className="btn btn-secondary btn-sm">
            Open
          </Link>
        )}
      </div>
    </div>
  );
}
