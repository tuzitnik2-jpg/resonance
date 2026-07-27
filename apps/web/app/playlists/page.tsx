"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { ApiError, createPlaylist, listPlaylists, type Playlist } from "@/lib/api-client";
import { Alert, AppShell, Button, EmptyState, PageHeader } from "@/components/ui";

export default function PlaylistsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listPlaylists()
      .then((page) => setPlaylists(page.items))
      .catch(() => setError("Failed to load playlists."));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
  }, [me]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createPlaylist({ name });
      setName("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.problem.detail ?? err.message)
          : "Failed to create playlist.",
      );
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell>
      <PageHeader title="Playlists" subtitle={`${playlists.length} collections`} />

      <form onSubmit={handleCreate} className="form-row" style={{ marginBottom: "1.25rem" }}>
        <input
          required
          placeholder="New collection name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        <Button type="submit" variant="primary">
          Create
        </Button>
      </form>

      {error && <Alert>{error}</Alert>}
      {playlists.length === 0 && <EmptyState>No playlists yet.</EmptyState>}
      <ul className="list">
        {playlists.map((playlist) => (
          <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="list-row">
            <div className="list-row-main">
              <div className="list-row-title">{playlist.name}</div>
            </div>
          </Link>
        ))}
      </ul>
    </AppShell>
  );
}
