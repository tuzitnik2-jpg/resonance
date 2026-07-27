"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  ApiError,
  deleteAlbum,
  getAlbum,
  listSongs,
  updateAlbum,
  type Album,
  type Song,
} from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, Hero } from "@/components/ui";

export default function AlbumDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    getAlbum(id).then((a) => {
      setAlbum(a);
      setTitle(a.title);
      setReleaseYear(a.releaseYear?.toString() ?? "");
    });
    listSongs({ albumId: id }).then((page) => setSongs(page.items));
  }, [me, id]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await updateAlbum(id, {
        title,
        releaseYear: releaseYear ? Number(releaseYear) : undefined,
      });
      setAlbum(result.album);
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete album "${album?.title}"?`)) return;
    await deleteAlbum(id);
    router.push("/albums");
  }

  if (authLoading || !me || !album) return null;

  return (
    <AppShell>
      <Hero
        tone="red"
        icon="◍"
        eyebrow="Album"
        title={album.title}
        artwork={
          album.artist
            ? { type: "album", artist: album.artist.canonicalName, title: album.title }
            : undefined
        }
        meta={
          <>
            {album.artist && (
              <Link href={`/artists/${album.artist.id}`}>{album.artist.canonicalName}</Link>
            )}
            {album.releaseYear ? <span className="hero-dot">{album.releaseYear}</span> : null}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete album
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="Details">
          <form onSubmit={handleSave}>
            <label className="field">
              <span className="field-label">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
            </label>
            <label className="field">
              <span className="field-label">Release year</span>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                className="input"
              />
            </label>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </Card>

        <Card title="Songs">
          <ul className="list">
            {songs.map((song) => (
              <Link key={song.id} href={`/songs/${song.id}`} className="list-row">
                <span className="list-row-main">{song.title}</span>
              </Link>
            ))}
          </ul>
          {songs.length === 0 && <EmptyState>No songs yet.</EmptyState>}
        </Card>
      </div>
    </AppShell>
  );
}
