"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { listSongs, type Song } from "@/lib/api-client";
import { AppShell, Badge, EmptyState, Loading } from "@/components/ui";

export default function LikedSongsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    listSongs({ favorite: true })
      .then((page) => setSongs(page.items))
      .finally(() => setLoading(false));
  }, [me]);

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <div className="collection-hero">
        <div className="collection-hero-art">♥</div>
        <div className="hero-body">
          <div className="eyebrow">Collection</div>
          <h1 className="hero-title">Liked Songs</h1>
          <div className="hero-meta">
            {songs.length} {songs.length === 1 ? "song" : "songs"} you love
          </div>
        </div>
      </div>

      {loading && <Loading />}
      {!loading && songs.length === 0 && (
        <EmptyState>No liked songs yet. Mark songs as favorites to see them here.</EmptyState>
      )}
      {!loading && songs.length > 0 && (
        <ul className="list">
          {songs.map((song, index) => {
            const userData = song.userData?.[0];
            return (
              <li key={song.id}>
                <Link href={`/songs/${song.id}`} className="list-row">
                  <span className="text-faint" style={{ width: 24, textAlign: "right" }}>
                    {index + 1}
                  </span>
                  <span className="list-row-main">
                    <span className="list-row-title">{song.title}</span>
                    <span className="list-row-meta">
                      {song.primaryArtist?.canonicalName}
                      {song.album ? ` · ${song.album.title}` : ""}
                    </span>
                  </span>
                  <span className="list-row-side">
                    {userData?.rating ? <Badge>{userData.rating}/10</Badge> : null}
                    <span aria-hidden>♥</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
