"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppShell, EmptyState, Loading, MediaCard, MediaGrid, Shelf } from "@/components/ui";
import {
  listArtists,
  listPlaylists,
  listSongs,
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

export default function HomePage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      listSongs({}).then((p) => setSongs(p.items)),
      listArtists().then((p) => setArtists(p.items)),
      listPlaylists().then((p) => setPlaylists(p.items)),
    ])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [me]);

  if (authLoading || !me) return null;

  const favorites = songs.filter((s) => s.userData?.[0]?.favorite);
  const hasAnything = songs.length || artists.length || playlists.length;

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
              />
            ))}
          </MediaGrid>
        </Shelf>
      )}

      {favorites.length > 0 && (
        <Shelf title="Your favorites" moreHref="/songs">
          <MediaGrid>
            {favorites.slice(0, 7).map((song) => (
              <MediaCard
                key={song.id}
                href={`/songs/${song.id}`}
                title={song.title}
                subtitle={song.primaryArtist?.canonicalName}
                icon="♥"
                tone="red"
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
    </AppShell>
  );
}
