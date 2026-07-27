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
import {
  Alert,
  AppShell,
  Button,
  Card,
  EmptyState,
  Hero,
  MediaCard,
  MediaGrid,
} from "@/components/ui";

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

  // Smart playlists auto-populate from rules: the API returns matching songs in `computed`.
  const isSmart = Array.isArray(playlist.computed) || playlist.type === "smart";
  const computed = playlist.computed ?? [];
  const trackCount = isSmart ? computed.length : (playlist.items?.length ?? 0);

  return (
    <AppShell>
      <Hero
        tone="green"
        icon={isSmart ? "♪" : "☰"}
        eyebrow={isSmart ? "Smart playlist" : "Playlist"}
        title={playlist.name}
        meta={
          <>
            {playlist.description ? <span>{playlist.description}</span> : null}
            {playlist.description ? (
              <span className="hero-dot">{trackCount} tracks</span>
            ) : (
              <span>{trackCount} tracks</span>
            )}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete playlist
          </Button>
        }
      />

      <div className="section-stack">
        {isSmart ? (
          <Card title="Songs">
            <p className="page-subtitle" style={{ marginTop: 0, marginBottom: "1rem" }}>
              Auto-updating from rules.
            </p>
            {computed.length === 0 ? (
              <EmptyState>No songs match these rules yet.</EmptyState>
            ) : (
              <MediaGrid>
                {computed.map((song) => (
                  <MediaCard
                    key={song.id}
                    href={`/songs/${song.id}`}
                    title={song.title}
                    subtitle={song.primaryArtist?.canonicalName}
                    icon="♪"
                    tone="green"
                    image={{ type: "song", id: song.id }}
                    track={
                      song.primaryArtist
                        ? {
                            id: song.id,
                            title: song.title,
                            artist: song.primaryArtist.canonicalName,
                          }
                        : undefined
                    }
                  />
                ))}
              </MediaGrid>
            )}
          </Card>
        ) : (
          <>
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
          </>
        )}
      </div>
    </AppShell>
  );
}
