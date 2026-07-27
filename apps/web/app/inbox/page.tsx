"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  approveAnalysis,
  listPendingAnalyses,
  rejectAnalysis,
  type SongAnalysis,
} from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function InboxPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [items, setItems] = useState<SongAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listPendingAnalyses()
      .then((page) => setItems(page.items))
      .catch(() => setError("Failed to load pending analyses."));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
  }, [me]);

  async function handleApprove(id: string) {
    await approveAnalysis(id);
    refresh();
  }

  async function handleReject(id: string) {
    await rejectAnalysis(id);
    refresh();
  }

  if (authLoading || !me) return null;

  return (
    <AppShell>
      <PageHeader
        title="AI Inbox"
        subtitle="Draft analyses proposed by AI, waiting for your approval. Nothing here is treated as fact until you approve it."
      />
      {error && <Alert>{error}</Alert>}
      {items.length === 0 && <EmptyState>Nothing pending.</EmptyState>}
      <div className="section-stack">
        {items.map((item) => (
          <Card key={item.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{item.analysisType}</strong>
              {item.song && (
                <Link href={`/songs/${item.songId}`}>
                  {item.song.title} — {item.song.primaryArtist?.canonicalName}
                </Link>
              )}
            </div>
            {item.summary && <p>{item.summary}</p>}
            <pre
              style={{
                background: "var(--color-bg)",
                padding: 8,
                overflowX: "auto",
                fontSize: 12,
              }}
            >
              {JSON.stringify(item.contentJson, null, 2)}
            </pre>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" onClick={() => handleApprove(item.id)}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => handleReject(item.id)}>
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
