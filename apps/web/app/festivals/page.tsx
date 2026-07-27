"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { ApiError, createFestival, listFestivals, type Festival } from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default function FestivalsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listFestivals()
      .then((page) => setFestivals(page.items))
      .catch(() => setError("Failed to load festivals."));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
  }, [me]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createFestival({ name, startDate: startDate || undefined });
      setName("");
      setStartDate("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add festival.",
      );
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell>
      <PageHeader title="Festivals" subtitle={`${festivals.length} total`} />

      <div className="section-stack">
        <Card title="Add festival">
          <form onSubmit={handleCreate} className="form-row">
            <input
              required
              placeholder="Festival name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
          {error && <Alert>{error}</Alert>}
        </Card>

        <Card title="Your festivals">
          {festivals.length === 0 && <EmptyState>No festivals yet.</EmptyState>}
          <ul className="list">
            {festivals.map((festival) => (
              <Link key={festival.id} href={`/festivals/${festival.id}`} className="list-row">
                <div className="list-row-main">
                  <div className="list-row-title">{festival.name}</div>
                  {festival.startDate && (
                    <div className="list-row-meta">
                      {new Date(festival.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
