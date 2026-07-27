"use client";

import { useRef, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { ApiError, analyzeImport, commitImport, type ImportJob } from "@/lib/api-client";
import { Alert, AppShell, Button, Card, PageHeader } from "@/components/ui";

export default function ImportPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const fileInput = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChange() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const csvContent = await file.text();
      const result = await analyzeImport(file.name, csvContent);
      setJob(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to analyze file.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!job) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commitImport(job.id);
      setJob(result);
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Commit failed.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <PageHeader
        title="Import CSV"
        subtitle="Expected columns: track_name, artist_name, album_name, release_year, spotify_url, rating, favorite, note, tags, date_added. Only track_name and artist_name are required."
      />

      <Card>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={busy}
        />
        {error && <Alert>{error}</Alert>}
        {busy && <p className="text-muted">Working…</p>}
      </Card>

      {job && (
        <Card title={`Preview — ${job.filename}`}>
          <p>
            {job.summaryJson.validRows} valid row(s), {job.summaryJson.errors.length} error(s).
            {job.summaryJson.committed &&
              ` Committed: ${job.summaryJson.songsCreated} created, ${job.summaryJson.duplicatesSkipped} duplicates skipped.`}
          </p>
          {job.summaryJson.errors.length > 0 && (
            <ul>
              {job.summaryJson.errors.map((e) => (
                <li key={e.rowIndex} style={{ color: "var(--color-danger)" }}>
                  Row {e.rowIndex}: {e.message}
                </li>
              ))}
            </ul>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
            <thead>
              <tr
                style={{ textAlign: "left", borderBottom: "1px solid var(--color-border-strong)" }}
              >
                <th>Track</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {job.summaryJson.preview.map((row) => (
                <tr key={row.rowIndex} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td>{row.trackName}</td>
                  <td>{row.artistName}</td>
                  <td>{row.albumName ?? ""}</td>
                  <td>{row.duplicate ? "Duplicate — will be skipped" : "New"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!job.summaryJson.committed && (
            <Button
              variant="primary"
              onClick={handleCommit}
              disabled={busy}
              style={{ marginTop: "1rem" }}
            >
              Confirm import
            </Button>
          )}
        </Card>
      )}
    </AppShell>
  );
}
