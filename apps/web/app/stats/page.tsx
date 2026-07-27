"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { getStats, type LibraryStats } from "@/lib/api-client";
import { AppShell, Card, EmptyState, PageHeader } from "@/components/ui";

export default function StatsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [stats, setStats] = useState<LibraryStats | null>(null);

  useEffect(() => {
    if (!me) return;
    getStats().then(setStats);
  }, [me]);

  if (authLoading || !me || !stats) return null;

  return (
    <AppShell width="wide">
      <PageHeader title="Music history" />

      <div className="section-stack">
        <Card title="Library">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalSongs}</div>
              <div className="stat-label">Songs total</div>
            </div>
          </div>
        </Card>

        <Card title="By decade">
          <div className="stat-grid">
            {Object.entries(stats.songsByDecade)
              .sort()
              .map(([decade, count]) => (
                <div className="stat-card" key={decade}>
                  <div className="stat-value">{count}</div>
                  <div className="stat-label">{decade}</div>
                </div>
              ))}
          </div>
        </Card>

        <Card title="Top tags">
          {stats.topTags.length === 0 ? (
            <EmptyState>No tags yet.</EmptyState>
          ) : (
            <div className="stat-grid">
              {stats.topTags.map((t) => (
                <div className="stat-card" key={t.tag}>
                  <div className="stat-value">{t.count}</div>
                  <div className="stat-label">{t.tag}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Top favorite artists">
          {stats.topFavoriteArtists.length === 0 ? (
            <EmptyState>No favorites yet.</EmptyState>
          ) : (
            <div className="stat-grid">
              {stats.topFavoriteArtists.map((a) => (
                <div className="stat-card" key={a.name}>
                  <div className="stat-value">{a.count}</div>
                  <div className="stat-label">{a.name}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
