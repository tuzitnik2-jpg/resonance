"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Alert, AppShell, Button, Card, EmptyState, Hero } from "@/components/ui";
import {
  ApiError,
  deleteArtist,
  enrichArtistFromMusicBrainz,
  getArtist,
  listAlbums,
  listSongs,
  updateArtist,
  type Album,
  type Artist,
  type Song,
} from "@/lib/api-client";

export default function ArtistDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    getArtist(id).then((a) => {
      setArtist(a);
      setName(a.canonicalName);
      setDescription(a.description ?? "");
    });
    listSongs({ artistId: id }).then((page) => setSongs(page.items));
    listAlbums({ artistId: id }).then((page) => setAlbums(page.items));
  }, [me, id]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await updateArtist(id, { canonicalName: name, description });
      setArtist(result.artist);
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete artist "${artist?.canonicalName}"? This cannot be undone from the UI.`))
      return;
    await deleteArtist(id);
    router.push("/artists");
  }

  async function handleEnrich() {
    setEnriching(true);
    setEnrichMessage(null);
    try {
      const result = await enrichArtistFromMusicBrainz(id);
      if (result.attached && result.artist) {
        setArtist(result.artist);
        setEnrichMessage(`Linked to MusicBrainz (${result.artist.musicbrainzId}).`);
      } else {
        setEnrichMessage(
          result.candidates.length > 0
            ? `No confident match. Closest: ${result.candidates[0].name} (score ${result.candidates[0].score}).`
            : "No MusicBrainz match found.",
        );
      }
    } catch {
      setEnrichMessage("MusicBrainz lookup failed.");
    } finally {
      setEnriching(false);
    }
  }

  if (authLoading || !me || !artist) return null;

  return (
    <AppShell>
      <Hero
        tone="gold"
        icon="◈"
        eyebrow="Artist"
        title={artist.canonicalName}
        round
        artwork={{ type: "artist", artist: artist.canonicalName }}
        meta={
          <>
            {artist.countryCode ? <span>{artist.countryCode}</span> : null}
            {artist.musicbrainzId ? (
              <span className="hero-dot">
                <a
                  href={`https://musicbrainz.org/artist/${artist.musicbrainzId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  MusicBrainz
                </a>
              </span>
            ) : null}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete artist
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="Details">
          <form onSubmit={handleSave}>
            <label className="field">
              <span className="field-label">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="textarea"
              />
            </label>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </Card>

        <Card title="MusicBrainz">
          {artist.musicbrainzId ? (
            <p>
              Linked:{" "}
              <a
                href={`https://musicbrainz.org/artist/${artist.musicbrainzId}`}
                target="_blank"
                rel="noreferrer"
              >
                {artist.musicbrainzId}
              </a>
            </p>
          ) : (
            <Button onClick={handleEnrich} disabled={enriching}>
              {enriching ? "Looking up…" : "Look up on MusicBrainz"}
            </Button>
          )}
          {enrichMessage && <p className="text-muted">{enrichMessage}</p>}
        </Card>

        <Card title="Albums">
          <ul className="list">
            {albums.map((album) => (
              <li key={album.id} className="list-row">
                <Link href={`/albums/${album.id}`} className="list-row-main">
                  <div className="list-row-title">{album.title}</div>
                </Link>
                {album.releaseYear ? (
                  <span className="list-row-side">{album.releaseYear}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {albums.length === 0 && <EmptyState>No albums yet.</EmptyState>}
        </Card>

        <Card title="Songs">
          <ul className="list">
            {songs.map((song) => (
              <li key={song.id} className="list-row">
                <Link href={`/songs/${song.id}`} className="list-row-main">
                  <div className="list-row-title">{song.title}</div>
                </Link>
              </li>
            ))}
          </ul>
          {songs.length === 0 && <EmptyState>No songs yet.</EmptyState>}
        </Card>
      </div>
    </AppShell>
  );
}
