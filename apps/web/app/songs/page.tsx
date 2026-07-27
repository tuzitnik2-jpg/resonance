"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { listSongs, type Song } from "@/lib/api-client";
import { Alert, AppShell, Badge, EmptyState, Loading, PageHeader } from "@/components/ui";

export default function SongsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    listSongs({ query: query || undefined })
      .then((page) => setSongs(page.items))
      .catch(() => setError("Failed to load songs."))
      .finally(() => setLoading(false));
  }, [me, query]);

  if (authLoading || !me) return null;

  return (
    <AppShell>
      <PageHeader
        title="Songs"
        subtitle={`${songs.length} in your library`}
        actions={
          <Link href="/songs/new" className="btn btn-primary">
            + Add song
          </Link>
        }
      />
      <input
        type="search"
        placeholder="Search by title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
        style={{ marginBottom: "1.25rem" }}
      />
      {error && <Alert>{error}</Alert>}
      {loading && <Loading />}
      {!loading && songs.length === 0 && <EmptyState>No songs yet.</EmptyState>}
      <ul className="list">
        {songs.map((song) => {
          const userData = song.userData?.[0];
          return (
            <Link key={song.id} href={`/songs/${song.id}`} className="list-row">
              <div className="list-row-main">
                <div className="list-row-title">{song.title}</div>
                <div className="list-row-meta">{song.primaryArtist?.canonicalName}</div>
              </div>
              <span className="list-row-side">
                {userData?.favorite && <Badge tone="danger">♥ favorite</Badge>}
                {userData?.rating ? <Badge>{userData.rating}/10</Badge> : null}
              </span>
            </Link>
          );
        })}
      </ul>
    </AppShell>
  );
}
