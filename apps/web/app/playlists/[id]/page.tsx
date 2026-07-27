"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  ApiError,
  addPlaylistItem,
  deletePlaylist,
  getPlaylist,
  listSongs,
  removePlaylistItem,
  type Playlist,
  type Song,
} from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function PlaylistDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<Song[]>([]);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getPlaylist(id).then(setPlaylist);
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  useEffect(() => {
    if (!songQuery) return;
    const handle = setTimeout(() => {
      listSongs({ query: songQuery }).then((page) => setSongResults(page.items));
    }, 250);
    return () => clearTimeout(handle);
  }, [songQuery]);

  async function handleAdd(event: FormEvent, songId: string) {
    event.preventDefault();
    setError(null);
    try {
      await addPlaylistItem(id, { songId });
      setSongQuery("");
      setSongResults([]);
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add song.",
      );
    }
  }

  async function handleRemove(songId: string) {
    await removePlaylistItem(id, songId);
    refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete playlist "${playlist?.name}"?`)) return;
    await deletePlaylist(id);
    router.push("/playlists");
  }

  if (authLoading || !me || !playlist) return null;

  return (
    <AppShell>
      <PageHeader
        title={playlist.name}
        subtitle={playlist.description}
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete playlist
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="Songs">
          <ul className="list">
            {(playlist.items ?? []).map((item) => (
              <li key={item.songId} className="list-row">
                <Link href={`/songs/${item.songId}`} className="list-row-main">
                  <div className="list-row-title">{item.song.title}</div>
                  <div className="list-row-meta">{item.song.primaryArtist?.canonicalName}</div>
                </Link>
                <Button variant="danger" size="sm" onClick={() => handleRemove(item.songId)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {(playlist.items ?? []).length === 0 && <EmptyState>No songs yet.</EmptyState>}
        </Card>

        <Card title="Add songs">
          <div style={{ position: "relative" }}>
            <input
              placeholder="Search songs to add…"
              value={songQuery}
              onChange={(e) => setSongQuery(e.target.value)}
              className="input"
            />
            {songQuery && songResults.length > 0 && (
              <ul
                className="list"
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  marginTop: 4,
                }}
              >
                {songResults.map((song) => (
                  <li key={song.id}>
                    <button
                      onClick={(e) => handleAdd(e, song.id)}
                      className="list-row"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div className="list-row-main">
                        <div className="list-row-title">{song.title}</div>
                        <div className="list-row-meta">{song.primaryArtist?.canonicalName}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <Alert>{error}</Alert>}
        </Card>
      </div>
    </AppShell>
  );
}
