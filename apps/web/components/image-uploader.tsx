"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  deleteEntityImage,
  entityImageUrl,
  setEntityImage,
  suggestEntityImage,
  type ImageEntity,
} from "@/lib/api-client";
import { resizeImageToBase64 } from "@/lib/resize-image";

/**
 * Upload / replace / remove a cover picture for a song, artist, or album. The parent owns the
 * cache-busting `version` and bumps it via `onChange` so any other art tiles (e.g. the Hero)
 * re-render with the fresh image.
 */
export function ImageUploader({
  type,
  id,
  version,
  onChange,
  hasImageInitially = false,
  suggestArtist,
  suggestTitle,
}: {
  type: ImageEntity;
  id: string;
  version: number;
  onChange: () => void;
  hasImageInitially?: boolean;
  /** When set, shows a "Suggest cover" button that fetches art from iTunes by name. */
  suggestArtist?: string;
  suggestTitle?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic "there is an image" flag: we don't know for sure, so assume none until the user
  // uploads (or the caller says one exists), and flip off on remove.
  const [hasImage, setHasImage] = useState(hasImageInitially);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { data, mimeType } = await resizeImageToBase64(file);
      await setEntityImage(type, id, data, mimeType);
      setHasImage(true);
      onChange();
    } catch {
      setError("Could not upload that image.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await deleteEntityImage(type, id);
      setHasImage(false);
      onChange();
    } catch {
      setError("Could not remove the image.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSuggest() {
    if (!suggestArtist) return;
    setBusy(true);
    setError(null);
    try {
      const { applied } = await suggestEntityImage(type, id, suggestArtist, suggestTitle);
      if (applied) {
        setHasImage(true);
        onChange();
      } else {
        setError("No cover was found to suggest.");
      }
    } catch {
      setError("Could not fetch a suggestion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <div
        className="media-art tile-mixed"
        style={{ width: 96, height: 96, margin: 0, fontSize: "1.8rem", flexShrink: 0 }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={version}
            src={entityImageUrl(type, id, version)}
            alt=""
            className="art-img"
            onError={() => setHasImage(false)}
          />
        ) : (
          "🖼"
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : hasImage ? "Replace image" : "Upload image"}
          </button>
          {suggestArtist && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={handleSuggest}
            >
              Suggest cover
            </button>
          )}
          {hasImage && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={handleRemove}
            >
              Remove
            </button>
          )}
        </div>
        <span className="text-faint" style={{ fontSize: "0.78rem" }}>
          JPG, PNG, WebP or GIF — resized automatically.
        </span>
        {error && (
          <span
            className="text-muted"
            style={{ color: "var(--color-danger)", fontSize: "0.82rem" }}
          >
            {error}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
