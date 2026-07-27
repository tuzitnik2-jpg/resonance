"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-current-user";
import { Alert, AppShell, Button, Card, Field, PageHeader } from "@/components/ui";
import { ApiError, createArtist, createSong } from "@/lib/api-client";

export default function NewSongPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setWarning(null);
    setSubmitting(true);
    try {
      const artistResult = await createArtist({ canonicalName: artistName });
      if (artistResult.duplicateWarning) {
        setWarning(`Using existing artist: ${artistResult.artist.canonicalName}`);
      }

      const songResult = await createSong({
        title,
        primaryArtistId: artistResult.artist.id,
      });

      const songId = songResult.duplicateWarning?.existingId ?? songResult.song.id;
      router.push(`/songs/${songId}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add song.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell width="narrow">
      <PageHeader title="Add a song" />
      <Card>
        <form onSubmit={handleSubmit}>
          <Field label="Title">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Artist">
            <input
              required
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="input"
            />
          </Field>
          {warning && (
            <p
              className="alert"
              style={{ background: "var(--color-warning-soft)", color: "var(--color-warning)" }}
            >
              {warning}
            </p>
          )}
          {error && <Alert>{error}</Alert>}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving…" : "Add song"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
