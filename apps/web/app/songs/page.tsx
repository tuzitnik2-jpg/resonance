"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { listSongs, type Song } from "@/lib/api-client";
import {
  Alert,
  AppShell,
  EmptyState,
  Loading,
  MediaCard,
  MediaGrid,
  PageHeader,
} from "@/components/ui";

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
    <AppShell width="wide">
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
        style={{ marginBottom: "1.5rem", maxWidth: 420 }}
      />
      {error && <Alert>{error}</Alert>}
      {loading && <Loading />}
      {!loading && songs.length === 0 && <EmptyState>No songs yet.</EmptyState>}
      <MediaGrid>
        {songs.map((song) => {
          const userData = song.userData?.[0];
          return (
            <MediaCard
              key={song.id}
              href={`/songs/${song.id}`}
              title={song.title}
              subtitle={
                <>
                  {song.primaryArtist?.canonicalName}
                  {userData?.favorite ? " · ♥" : ""}
                  {userData?.rating ? ` · ${userData.rating}/10` : ""}
                </>
              }
              icon="♪"
              tone={userData?.favorite ? "red" : "green"}
            />
          );
        })}
      </MediaGrid>
    </AppShell>
  );
}
