"use client";

import { useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { askAssistant, ApiError } from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, PageHeader } from "@/components/ui";

interface Exchange {
  question: string;
  answer: string;
}

export default function AssistantPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const { answer } = await askAssistant(trimmed);
      setExchanges((prev) => [...prev, { question: trimmed, answer }]);
      setQuestion("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problem.detail ?? err.problem.title);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell width="narrow">
      <PageHeader
        title="Ask your library"
        subtitle="Ask questions about your songs, artists, and tags — answered only from your data."
      />

      {error && <Alert>{error}</Alert>}

      <div className="section-stack">
        {exchanges.length === 0 && !loading && (
          <EmptyState>{'Try: "what reggae from the 70s do I have?"'}</EmptyState>
        )}

        {exchanges.map((exchange, index) => (
          <Card key={index}>
            <div className="text-muted" style={{ fontWeight: 700, marginBottom: "0.35rem" }}>
              You
            </div>
            <p style={{ marginTop: 0, marginBottom: "1rem" }}>{exchange.question}</p>
            <div style={{ whiteSpace: "pre-wrap" }}>{exchange.answer}</div>
          </Card>
        ))}

        {loading && (
          <Card>
            <span className="text-muted">Thinking…</span>
          </Card>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
        <textarea
          className="textarea"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about your library…"
          rows={3}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Thinking…" : "Ask"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
