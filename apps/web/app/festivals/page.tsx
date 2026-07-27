"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { ApiError, createFestival, listFestivals, type Festival } from "@/lib/api-client";
import {
  Alert,
  AppShell,
  Button,
  Card,
  EmptyState,
  MediaCard,
  MediaGrid,
  PageHeader,
} from "@/components/ui";

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
    <AppShell width="wide">
      <PageHeader title="Festivals" subtitle={`${festivals.length} total`} />

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

      <div style={{ marginTop: "1.5rem" }}>
        {festivals.length === 0 && <EmptyState>No festivals yet.</EmptyState>}
        <MediaGrid>
          {festivals.map((festival) => {
            const location = [festival.city, festival.countryCode].filter(Boolean).join(", ");
            const dates = festival.startDate
              ? new Date(festival.startDate).toLocaleDateString()
              : undefined;
            return (
              <MediaCard
                key={festival.id}
                href={`/festivals/${festival.id}`}
                title={festival.name}
                subtitle={location || dates}
                icon="✺"
                tone="gold"
              />
            );
          })}
        </MediaGrid>
      </div>
    </AppShell>
  );
}
