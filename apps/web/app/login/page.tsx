"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, login } from "@/lib/api-client";
import { Alert, Button, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/songs");
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.35rem" }}>
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
          <Button type="submit" variant="primary" size="md" disabled={submitting} className="btn-block">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
