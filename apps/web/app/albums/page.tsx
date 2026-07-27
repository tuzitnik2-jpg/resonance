"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  ApiError,
  createAlbum,
  listAlbums,
  listArtists,
  type Album,
  type Artist,
} from "@/lib/api-client";
import {
  Alert,
  AppShell,
  Button,
  EmptyState,
  Loading,
  MediaCard,
  MediaGrid,
  PageHeader,
} from "@/components/ui";

export default function AlbumsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  function refresh() {
    listAlbums()
      .then((page) => {
        setAlbums(page.items);
        setCursor(page.nextCursor);
      })
      .catch(() => setError("Failed to load albums."))
      .finally(() => setLoading(false));
  }

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listAlbums({ cursor });
      setAlbums((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setError("Failed to load albums.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    listArtists().then((page) => {
      setArtists(page.items);
      if (page.items[0]) setArtistId(page.items[0].id);
    });
  }, [me]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createAlbum({ title, artistId });
      setTitle("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add album.",
      );
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <PageHeader title="Albums" subtitle={`${albums.length} in your library`} />
      <form onSubmit={handleCreate} className="form-row" style={{ marginBottom: "1.25rem" }}>
        <input
          required
          placeholder="Album title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
        />
        <select
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
          className="select"
          required
        >
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.canonicalName}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary" disabled={!artistId}>
          Add
        </Button>
      </form>
      {error && <Alert>{error}</Alert>}
      {loading && <Loading />}
      {!loading && albums.length === 0 && <EmptyState>No albums yet.</EmptyState>}
      <MediaGrid>
        {albums.map((album) => (
          <MediaCard
            key={album.id}
            href={`/albums/${album.id}`}
            title={album.title}
            subtitle={
              <>
                {album.artist?.canonicalName}
                {album.releaseYear ? ` · ${album.releaseYear}` : ""}
                {album.label ? ` · ${album.label}` : ""}
              </>
            }
            icon="◍"
            tone="red"
            image={{ type: "album", id: album.id }}
          />
        ))}
      </MediaGrid>
      {cursor ? (
        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <Button onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}
