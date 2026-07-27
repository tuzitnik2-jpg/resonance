"use client";

import { useEffect, useState } from "react";
import { getArtwork } from "./api-client";

export interface ArtworkQuery {
  type: "song" | "album" | "artist";
  artist: string;
  title?: string;
}

// Module-level cache so re-renders and repeated cards don't re-request the same artwork.
const cache = new Map<string, string | null>();

/** Lazily resolves cover art for an entity; returns null while loading or if none is found. */
export function useArtwork(query?: ArtworkQuery): string | null {
  const key = query ? `${query.type}:${query.artist}:${query.title ?? ""}` : "";
  // We read the resolved value from the module cache during render; this counter just forces a
  // re-render once the async lookup lands, so setState never runs synchronously in the effect.
  const [, bump] = useState(0);

  useEffect(() => {
    if (!query || !query.artist || cache.has(key)) return;
    let cancelled = false;
    getArtwork(query)
      .then((res) => {
        cache.set(key, res.imageUrl);
        if (!cancelled) bump((n) => n + 1);
      })
      .catch(() => {
        cache.set(key, null);
        if (!cancelled) bump((n) => n + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [key, query]);

  return query ? (cache.get(key) ?? null) : null;
}
