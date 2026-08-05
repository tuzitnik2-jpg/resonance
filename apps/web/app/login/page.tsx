"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getApiHealth, login } from "@/lib/api-client";
import { Alert, Button, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // On the free tier the API sleeps after ~15 min idle and the first request can take up to a
  // minute to wake it — which makes a click on "Sign in" look like it did nothing. We warm the API
  // as soon as this page loads (overlapping the cold start with the user reading/typing) and track
  // whether it's ready so we can show honest status instead of a frozen button.
  const [serverReady, setServerReady] = useState(false);
  const [waking, setWaking] = useState(false);
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApiHealth().then((h) => {
      if (!cancelled && h) setServerReady(true);
    });
    return () => {
      cancelled = true;
      if (wakeTimer.current) clearTimeout(wakeTimer.current);
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    // Only warn about a wait if the server hasn't already warmed up from the on-load ping.
    setWaking(false);
    if (!serverReady) wakeTimer.current = setTimeout(() => setWaking(true), 2500);
    try {
      await login(email, password);
      setServerReady(true);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Login failed.");
    } finally {
      if (wakeTimer.current) clearTimeout(wakeTimer.current);
      setSubmitting(false);
      setWaking(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.35rem" }}
        >
          <span className="sidebar-brand-mark" style={{ width: 36, height: 36, fontSize: "1rem" }}>
            R
          </span>
          <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Resonance</h1>
        </div>
        <p className="text-muted" style={{ marginBottom: "1.75rem", fontSize: "0.88rem" }}>
          Sign in to your personal music archive.
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              type="email"
              required
              autoFocus
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting}
            className="btn-block"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
          {waking && (
            <p className="text-muted" style={{ marginTop: "0.75rem", fontSize: "0.82rem" }}>
              Waking the server (free tier) — this first request can take up to a minute. Hang
              tight…
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
