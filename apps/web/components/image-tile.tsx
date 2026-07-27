"use client";

import { useState, type ReactNode } from "react";
import { entityImageUrl, type ImageEntity } from "@/lib/api-client";

export interface EntityImageRef {
  type: ImageEntity;
  id: string;
  version?: number;
}

/**
 * Renders an entity's art tile: the user's uploaded image when one exists, otherwise the gradient
 * placeholder with its glyph. No pre-check — the <img> either loads or errors (404) into fallback.
 */
export function ImageTile({
  image,
  className,
  icon,
}: {
  image?: EntityImageRef;
  className: string;
  icon: ReactNode;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = image ? entityImageUrl(image.type, image.id, image.version) : null;

  return (
    <div className={className}>
      {!loaded && icon}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="art-img"
          loading="lazy"
          style={{ display: loaded ? "block" : "none" }}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      )}
    </div>
  );
}
