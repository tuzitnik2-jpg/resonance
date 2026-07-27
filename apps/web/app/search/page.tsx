"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  listAlbums,
  listArtists,
  listSongs,
  listTags,
  type Album,
  type Artist,
  type Song,
  type Tag,
} from "@/lib/api-client";
import {
  AppShell,
  EmptyState,
  Loading,
  MediaCard,
  MediaGrid,
  PageHeader,
  Shelf,
} from "@/components/ui";

interface Results {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  tags: Tag[];
}

const EMPTY_RESULTS: Results = { songs: [], artists: [], albums: [], tags: [] };

export default function SearchPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY_RESULTS);
  // The query whose results are currently in `results`; loading is derived from this so we never
  // call setState synchronously inside an effect.
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);

  // Debounce the raw input into the active query (~250ms).
  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    if (!me || !query) return;

    let cancelled = false;
    const needle = query.toLowerCase();

    Promise.all([listSongs({ query }), listArtists({ query }), listAlbums({}), listTags()])
      .then(([songs, artists, albums, tags]) => {
        if (cancelled) return;
        setResults({
          songs: songs.items,
          artists: artists.items,
          albums: albums.items.filter((a) => a.title.toLowerCase().includes(needle)),
          tags: tags.items.filter((t) => t.name.toLowerCase().includes(needle)),
        });
        setResolvedQuery(query);
      })
      .catch(() => {
        if (cancelled) return;
        setResults(EMPTY_RESULTS);
        setResolvedQuery(query);
      });

    return () => {
      cancelled = true;
    };
  }, [me, query]);

  const loading = Boolean(query) && resolvedQuery !== query;

  const hasResults = useMemo(
    () =>
      results.songs.length > 0 ||
      results.artists.length > 0 ||
      results.albums.length > 0 ||
      results.tags.length > 0,
    [results],
  );

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <PageHeader title="Search" />
      <input
        type="search"
        autoFocus
        placeholder="Search songs, artists, albums…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="input"
        style={{ marginBottom: "2rem", maxWidth: 560, fontSize: "1.1rem" }}
      />

      {!query && (
        <div>
          <div className="eyebrow">Search your library</div>
          <p className="empty-state">Find any song, artist, album, or tag.</p>
        </div>
      )}

      {query && loading && <Loading />}

      {query && !loading && !hasResults && <EmptyState>No results for “{query}”.</EmptyState>}

      {query && !loading && results.songs.length > 0 && (
        <Shelf title="Songs">
          <MediaGrid>
            {results.songs.map((song) => (
              <MediaCard
                key={song.id}
                href={`/songs/${song.id}`}
                title={song.title}
                subtitle={song.primaryArtist?.canonicalName}
                icon="♪"
                tone="green"
                artwork={
                  song.primaryArtist
                    ? { type: "song", artist: song.primaryArtist.canonicalName, title: song.title }
                    : undefined
                }
              />
            ))}
          </MediaGrid>
        </Shelf>
      )}

      {query && !loading && results.artists.length > 0 && (
        <Shelf title="Artists">
          <MediaGrid>
            {results.artists.map((artist) => (
              <MediaCard
                key={artist.id}
                href={`/artists/${artist.id}`}
                title={artist.canonicalName}
                subtitle={artist.countryCode || "Artist"}
                icon="◈"
                tone="gold"
                round
                artwork={{ type: "artist", artist: artist.canonicalName }}
              />
            ))}
          </MediaGrid>
        </Shelf>
      )}

      {query && !loading && results.albums.length > 0 && (
        <Shelf title="Albums">
          <MediaGrid>
            {results.albums.map((album) => (
              <MediaCard
                key={album.id}
                href={`/albums/${album.id}`}
                title={album.title}
                subtitle={album.artist?.canonicalName}
                icon="◍"
                tone="red"
                artwork={
                  album.artist
                    ? { type: "album", artist: album.artist.canonicalName, title: album.title }
                    : undefined
                }
              />
            ))}
          </MediaGrid>
        </Shelf>
      )}

      {query && !loading && results.tags.length > 0 && (
        <Shelf title="Tags">
          <MediaGrid>
            {results.tags.map((tag) => (
              <MediaCard
                key={tag.id}
                href="/tags"
                title={tag.name}
                subtitle={tag.category}
                icon="◉"
                tone="mixed"
              />
            ))}
          </MediaGrid>
        </Shelf>
      )}
    </AppShell>
  );
}
