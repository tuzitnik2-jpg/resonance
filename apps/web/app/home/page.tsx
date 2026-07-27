"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  AppShell,
  EmptyState,
  LinkButton,
  Loading,
  MediaCard,
  MediaGrid,
  Shelf,
} from "@/components/ui";
import {
  listAlbums,
  listArtists,
  listPlaylists,
  listSongs,
  type Album,
  type Artist,
  type Playlist,
  type Song,
} from "@/lib/api-client";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function songImage(song: Song) {
  return { type: "song", id: song.id } as const;
}

function songTrack(song: Song) {
  return song.primaryArtist
    ? { id: song.id, title: song.title, artist: song.primaryArtist.canonicalName }
    : undefined;
}

export default function HomePage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [featured, setFeatured] = useState<Song | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      listSongs({}),
      listSongs({ favorite: true }),
      listArtists(),
      listAlbums({}),
      listPlaylists(),
    ])
      .then(([s, f, ar, al, pl]) => {
        setSongs(s.items);
        setFavorites(f.items);
        setArtists(ar.items);
        setAlbums(al.items);
        setPlaylists(pl.items);
        // Pick the highlighted song here (in an async callback), not during render —
        // Math.random is impure and must not run in the render path.
        const pool = f.items.length > 0 ? f.items : s.items;
        if (pool.length > 0) setFeatured(pool[Math.floor(Math.random() * pool.length)]);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [me]);

  const topRated = useMemo(
    () =>
      songs
        .filter((s) => s.userData?.[0]?.rating != null)
        .sort((a, b) => (b.userData?.[0]?.rating ?? 0) - (a.userData?.[0]?.rating ?? 0))
        .slice(0, 7),
    [songs],
  );

  // Song has no createdAt on its type, so "Recently added" reuses a distinct slice
  // (newest-first assuming append order) rather than a real timestamp sort.
  const recentlyAdded = useMemo(() => [...songs].reverse().slice(0, 7), [songs]);

  if (authLoading || !me) return null;

  const hasAnything = songs.length || artists.length || albums.length || playlists.length;

  return (
    <AppShell width="wide">
      <div className="eyebrow" style={{ marginBottom: "0.4rem" }}>
        {greeting()}
      </div>
      <h1 className="page-title" style={{ fontSize: "2.4rem", marginBottom: "2rem" }}>
        Welcome back
      </h1>

      {loading && <Loading />}
      {!loading && !hasAnything && (
        <EmptyState>Your archive is empty. Add a song from the sidebar to get started.</EmptyState>
      )}

      {!loading && hasAnything ? (
        <>
          {/* Quick stats */}
          <div className="stat-grid" style={{ marginBottom: "2rem" }}>
            <div className="stat-card">
              <div className="stat-value">{songs.length}</div>
              <div className="stat-label">Songs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{artists.length}</div>
              <div className="stat-label">Artists</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{albums.length}</div>
              <div className="stat-label">Albums</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{favorites.length}</div>
              <div className="stat-label">Favorites</div>
            </div>
          </div>

          {/* Feature hero */}
          {featured && (
            <div className="hero hero--green">
              <div className="hero-art tile-green">♪</div>
              <div className="hero-body">
                <div className="eyebrow">Featured</div>
                <h1 className="hero-title">{featured.title}</h1>
                <div className="hero-meta">
                  {featured.primaryArtist?.canonicalName ?? "Unknown artist"}
                  {featured.releaseYear ? (
                    <>
                      <span className="hero-dot" />
                      {featured.releaseYear}
                    </>
                  ) : null}
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <LinkButton href={`/songs/${featured.id}`} variant="primary">
                    Open
                  </LinkButton>
                </div>
              </div>
            </div>
          )}

          {songs.length > 0 && (
            <Shelf title="Jump back in" moreHref="/songs">
              <MediaGrid>
                {songs.slice(0, 7).map((song) => (
                  <MediaCard
                    key={song.id}
                    href={`/songs/${song.id}`}
                    title={song.title}
                    subtitle={song.primaryArtist?.canonicalName}
                    icon="♪"
                    tone="green"
                    image={songImage(song)}
                    track={songTrack(song)}
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}

          {favorites.length > 0 && (
            <Shelf title="Your favorites" moreHref="/liked">
              <MediaGrid>
                {favorites.slice(0, 7).map((song) => (
                  <MediaCard
                    key={song.id}
                    href={`/songs/${song.id}`}
                    title={song.title}
                    subtitle={song.primaryArtist?.canonicalName}
                    icon="♥"
                    tone="red"
                    image={songImage(song)}
                    track={songTrack(song)}
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}

          {recentlyAdded.length > 0 && (
            <Shelf title="Recently added" moreHref="/songs">
              <MediaGrid>
                {recentlyAdded.map((song) => (
                  <MediaCard
                    key={song.id}
                    href={`/songs/${song.id}`}
                    title={song.title}
                    subtitle={song.primaryArtist?.canonicalName}
                    icon="♪"
                    tone="green"
                    image={songImage(song)}
                    track={songTrack(song)}
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}

          {topRated.length > 0 && (
            <Shelf title="Top rated" moreHref="/songs">
              <MediaGrid>
                {topRated.map((song) => (
                  <MediaCard
                    key={song.id}
                    href={`/songs/${song.id}`}
                    title={song.title}
                    subtitle={
                      <>
                        {song.primaryArtist?.canonicalName}
                        {song.userData?.[0]?.rating ? ` · ${song.userData[0].rating}/10` : ""}
                      </>
                    }
                    icon="♪"
                    tone="gold"
                    image={songImage(song)}
                    track={songTrack(song)}
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}

          {artists.length > 0 && (
            <Shelf title="Artists" moreHref="/artists">
              <MediaGrid>
                {artists.slice(0, 7).map((artist) => (
                  <MediaCard
                    key={artist.id}
                    href={`/artists/${artist.id}`}
                    title={artist.canonicalName}
                    subtitle={artist.countryCode ?? "Artist"}
                    icon="◈"
                    tone="gold"
                    round
                    image={{ type: "artist", id: artist.id }}
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}

          {albums.length > 0 && (
            <Shelf title="Albums" moreHref="/albums">
              <MediaGrid>
                {albums.slice(0, 7).map((album) => (
                  <MediaCard
                    key={album.id}
                    href={`/albums/${album.id}`}
                    title={album.title}
                    subtitle={
                      album.artist?.canonicalName ??
                      (album.releaseYear ? String(album.releaseYear) : "Album")
                    }
                    icon="◍"
                    tone="red"
                    image={{ type: "album", id: album.id }}
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}

          {playlists.length > 0 && (
            <Shelf title="Playlists" moreHref="/playlists">
              <MediaGrid>
                {playlists.slice(0, 7).map((playlist) => (
                  <MediaCard
                    key={playlist.id}
                    href={`/playlists/${playlist.id}`}
                    title={playlist.name}
                    subtitle={playlist.description ?? `${playlist.items?.length ?? 0} tracks`}
                    icon="☰"
                    tone="mixed"
                  />
                ))}
              </MediaGrid>
            </Shelf>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
