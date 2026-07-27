"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { listSongs, listTags, type Song } from "@/lib/api-client";
import {
  Alert,
  AppShell,
  EmptyState,
  Loading,
  MediaCard,
  MediaGrid,
  PageHeader,
} from "@/components/ui";

type Filter = "all" | "favorites" | "top";
type Sort = "title" | "rating" | "year";

function SongsInner() {
  const { me, loading: authLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const tagId = searchParams.get("tagId") ?? undefined;

  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("title");
  const [tagName, setTagName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    listSongs({ query: query || undefined, tagId })
      .then((page) => setSongs(page.items))
      .catch(() => setError("Failed to load songs."))
      .finally(() => setLoading(false));
  }, [me, query, tagId]);

  useEffect(() => {
    if (!me || !tagId) return;
    listTags()
      .then((r) => setTagName(r.items.find((t) => t.id === tagId)?.name ?? null))
      .catch(() => undefined);
  }, [me, tagId]);

  const visible = useMemo(() => {
    let list = songs;
    if (filter === "favorites") list = list.filter((s) => s.userData?.[0]?.favorite);
    if (filter === "top") list = list.filter((s) => (s.userData?.[0]?.rating ?? 0) >= 8);
    return [...list].sort((a, b) => {
      if (sort === "rating") return (b.userData?.[0]?.rating ?? 0) - (a.userData?.[0]?.rating ?? 0);
      if (sort === "year") return (b.releaseYear ?? 0) - (a.releaseYear ?? 0);
      return a.title.localeCompare(b.title);
    });
  }, [songs, filter, sort]);

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <PageHeader
        title="Songs"
        subtitle={`${visible.length} of ${songs.length} shown`}
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
        style={{ marginBottom: "1.25rem", maxWidth: 420 }}
      />

      <div className="filter-bar">
        {(["all", "favorites", "top"] as Filter[]).map((f) => (
          <button
            key={f}
            className={`filter-chip${filter === f ? " is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "favorites" ? "Favorites" : "Top rated"}
          </button>
        ))}
        <select
          className="select"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          style={{ width: "auto", marginLeft: "auto" }}
        >
          <option value="title">Sort: Title</option>
          <option value="rating">Sort: Rating</option>
          <option value="year">Sort: Year</option>
        </select>
      </div>

      {tagId && (
        <div style={{ marginBottom: "1.25rem" }}>
          <span className="chip">
            Tag: {tagName ?? "…"}
            <Link href="/songs" className="chip-remove" aria-label="Clear tag filter">
              ✕
            </Link>
          </span>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {loading && <Loading />}
      {!loading && visible.length === 0 && (
        <EmptyState>
          {songs.length === 0 ? "No songs yet." : "Nothing matches this filter."}
        </EmptyState>
      )}

      <MediaGrid>
        {visible.map((song) => {
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
              image={{ type: "song", id: song.id }}
            />
          );
        })}
      </MediaGrid>
    </AppShell>
  );
}

export default function SongsPage() {
  return (
    <Suspense fallback={null}>
      <SongsInner />
    </Suspense>
  );
}
