"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listSongs, type Song } from "@/lib/api-client";

/**
 * A Spotify-shaped bottom bar — but honest: instead of fake playback controls, it surfaces a
 * real, random track from the library ("Now Spinning") with a shuffle button that picks another.
 * Everything here links to or acts on real data.
 */
export function NowSpinning() {
  const [pool, setPool] = useState<Song[]>([]);
  const [current, setCurrent] = useState<Song | null>(null);

  function spin(songs: Song[]) {
    if (songs.length === 0) return;
    setCurrent(songs[Math.floor(Math.random() * songs.length)]);
  }

  useEffect(() => {
    let cancelled = false;
    listSongs({})
      .then((page) => {
        if (cancelled) return;
        setPool(page.items);
        spin(page.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="playbar">
      <div className="playbar-track">
        <div className="playbar-art tile-mixed vinyl-spin" aria-hidden>
          ♫
        </div>
        <div className="playbar-meta">
          {current ? (
            <>
              <Link href={`/songs/${current.id}`} className="playbar-title">
                {current.title}
              </Link>
              <div className="playbar-sub">{current.primaryArtist?.canonicalName ?? "—"}</div>
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
          onClick={() => spin(pool)}
          disabled={pool.length === 0}
          title="Spin again"
          aria-label="Spin a different track"
        >
          ⟳
        </button>
      </div>

      <div className="playbar-end">
        {current && (
          <Link href={`/songs/${current.id}`} className="btn btn-secondary btn-sm">
            Open
          </Link>
        )}
      </div>
    </div>
  );
}
