"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  ApiError,
  attachAlbumTag,
  createTag,
  deleteAlbum,
  detachAlbumTag,
  getAlbum,
  listSongs,
  listTags,
  updateAlbum,
  type Album,
  type Song,
  type Tag,
} from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, Hero } from "@/components/ui";
import { ImageUploader } from "@/components/image-uploader";

export default function AlbumDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [label, setLabel] = useState("");
  const [newTagId, setNewTagId] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);

  function refresh() {
    getAlbum(id).then((a) => {
      setAlbum(a);
      setTitle(a.title);
      setReleaseYear(a.releaseYear?.toString() ?? "");
      setLabel(a.label ?? "");
    });
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    listSongs({ albumId: id }).then((page) => setSongs(page.items));
    listTags().then((page) => setAllTags(page.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await updateAlbum(id, {
        title,
        releaseYear: releaseYear ? Number(releaseYear) : undefined,
        label: label || null,
      });
      setAlbum(result.album);
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAttachTag(event: FormEvent) {
    event.preventDefault();
    if (!newTagId) return;
    await attachAlbumTag(id, newTagId);
    setNewTagId("");
    refresh();
  }

  async function handleCreateAndAttachTag(event: FormEvent) {
    event.preventDefault();
    if (!newTagName) return;
    const tag = await createTag({ name: newTagName, category: "GENRE" });
    await attachAlbumTag(id, tag.id);
    setNewTagName("");
    listTags().then((page) => setAllTags(page.items));
    refresh();
  }

  async function handleDetachTag(tagId: string) {
    await detachAlbumTag(id, tagId);
    refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete album "${album?.title}"?`)) return;
    await deleteAlbum(id);
    router.push("/albums");
  }

  if (authLoading || !me || !album) return null;

  const attachedTagIds = new Set((album.albumTags ?? []).map((at) => at.tagId));
  const availableTags = allTags.filter((t) => !attachedTagIds.has(t.id));

  return (
    <AppShell>
      <Hero
        tone="red"
        icon="◍"
        eyebrow="Album"
        title={album.title}
        image={{ type: "album", id, version: imageVersion }}
        meta={
          <>
            {album.artist && (
              <Link href={`/artists/${album.artist.id}`}>{album.artist.canonicalName}</Link>
            )}
            {album.releaseYear ? <span className="hero-dot">{album.releaseYear}</span> : null}
            {album.label ? <span className="hero-dot">{album.label}</span> : null}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete album
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="Artwork">
          <ImageUploader
            type="album"
            id={id}
            version={imageVersion}
            onChange={() => setImageVersion((v) => v + 1)}
            suggestArtist={album.artist?.canonicalName}
            suggestTitle={album.title}
          />
        </Card>

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
            <label className="field">
              <span className="field-label">Label</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="input" />
            </label>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </Card>

        <Card title="Tags">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
            {(album.albumTags ?? []).map((at) => (
              <span key={at.tagId} className="chip">
                {at.tag.name}
                <button className="chip-remove" onClick={() => handleDetachTag(at.tagId)}>
                  ×
                </button>
              </span>
            ))}
            {(album.albumTags ?? []).length === 0 && <EmptyState>No tags yet.</EmptyState>}
          </div>
          <form onSubmit={handleAttachTag} className="form-row" style={{ marginBottom: "0.6rem" }}>
            <select
              value={newTagId}
              onChange={(e) => setNewTagId(e.target.value)}
              className="select"
            >
              <option value="">Attach existing tag…</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.category}: {tag.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={!newTagId}>
              Attach
            </Button>
          </form>
          <form onSubmit={handleCreateAndAttachTag} className="form-row">
            <input
              placeholder="Or create a new genre tag…"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="input"
            />
            <Button type="submit" disabled={!newTagName}>
              Create + attach
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
