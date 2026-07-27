"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { ApiError, createArtist, listArtists, type Artist } from "@/lib/api-client";
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

export default function ArtistsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    listArtists({ query: query || undefined })
      .then((page) => setArtists(page.items))
      .catch(() => setError("Failed to load artists."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, query]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createArtist({ canonicalName: name });
      setName("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add artist.",
      );
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <PageHeader title="Artists" subtitle={`${artists.length} in your library`} />
      <form onSubmit={handleCreate} className="form-row" style={{ marginBottom: "1rem" }}>
        <input
          required
          placeholder="New artist name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        <Button type="submit">Add</Button>
      </form>
      <input
        type="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
        style={{ marginBottom: "1.5rem", maxWidth: 420 }}
      />
      {error && <Alert>{error}</Alert>}
      {loading && <Loading />}
      {!loading && artists.length === 0 && <EmptyState>No artists yet.</EmptyState>}
      <MediaGrid>
        {artists.map((artist) => (
          <MediaCard
            key={artist.id}
            href={`/artists/${artist.id}`}
            title={artist.canonicalName}
            subtitle={artist.countryCode || "Artist"}
            icon="◈"
            tone="gold"
            round
            image={{ type: "artist", id: artist.id }}
          />
        ))}
      </MediaGrid>
    </AppShell>
  );
}
