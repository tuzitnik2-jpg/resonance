"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Alert, AppShell, Badge, Button, Card, EmptyState, Hero } from "@/components/ui";
import {
  ApiError,
  addFestivalPerformance,
  deleteFestival,
  getFestival,
  listArtists,
  removeFestivalPerformance,
  updateFestivalPerformance,
  type Artist,
  type Festival,
} from "@/lib/api-client";

export default function FestivalDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState("");
  const [priority, setPriority] = useState("3");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getFestival(id).then(setFestival);
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    listArtists().then((page) => {
      setArtists(page.items);
      if (page.items[0]) setArtistId(page.items[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  async function handleAddPerformance(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addFestivalPerformance(id, { artistId, priority: Number(priority) });
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add artist.",
      );
    }
  }

  async function handleToggleAttended(performanceId: string, attended: boolean) {
    await updateFestivalPerformance(id, performanceId, { attended: !attended });
    refresh();
  }

  async function handleRemove(performanceId: string) {
    await removeFestivalPerformance(id, performanceId);
    refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete festival "${festival?.name}"?`)) return;
    await deleteFestival(id);
    router.push("/festivals");
  }

  if (authLoading || !me || !festival) return null;

  const performances = [...(festival.performances ?? [])].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
  );

  return (
    <AppShell>
      <Hero
        tone="gold"
        icon="✺"
        eyebrow="Festival"
        title={festival.name}
        meta={
          <>
            {festival.city && <span>{festival.city}</span>}
            {festival.countryCode && (
              <span className={festival.city ? "hero-dot" : undefined}>{festival.countryCode}</span>
            )}
            {festival.startDate && (
              <span className={festival.city || festival.countryCode ? "hero-dot" : undefined}>
                {new Date(festival.startDate).toLocaleDateString()}
                {festival.endDate ? ` – ${new Date(festival.endDate).toLocaleDateString()}` : ""}
              </span>
            )}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete festival
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="Lineup (by priority)">
          {performances.length === 0 && <EmptyState>No lineup yet.</EmptyState>}
          <ul className="list">
            {performances.map((perf) => (
              <li key={perf.id} className="list-row">
                <div className="list-row-main">
                  <Badge>{perf.priority ?? "-"}</Badge>{" "}
                  <Link href={`/artists/${perf.artistId}`}>{perf.artist.canonicalName}</Link>
                </div>
                <span className="list-row-side">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={perf.attended}
                      onChange={() => handleToggleAttended(perf.id, perf.attended)}
                    />
                    Attended
                  </label>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(perf.id)}>
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddPerformance} className="form-row" style={{ marginTop: "1rem" }}>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="select"
            >
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.canonicalName}
                </option>
              ))}
            </select>
            <label className="field">
              <span className="field-label">Priority (1 = must-see)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input"
              />
            </label>
            <Button type="submit" variant="primary" disabled={!artistId}>
              Add to lineup
            </Button>
          </form>
          {error && <Alert>{error}</Alert>}
        </Card>
      </div>
    </AppShell>
  );
}
