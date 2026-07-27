"use client";

import type { ReactNode } from "react";
import { useArtwork, type ArtworkQuery } from "@/lib/use-artwork";

/**
 * Renders an entity's art tile: real cover art (fetched lazily by name) when available, otherwise
 * the gradient placeholder with its glyph. The gradient classes are passed via `className`.
 */
export function ArtworkTile({
  query,
  className,
  icon,
}: {
  query?: ArtworkQuery;
  className: string;
  icon: ReactNode;
}) {
  const url = useArtwork(query);
  return (
    <div className={className}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="art-img" loading="lazy" />
      ) : (
        icon
      )}
    </div>
  );
}
