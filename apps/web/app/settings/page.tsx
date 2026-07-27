"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { fullExportUrl, generateMcpToken, songsCsvExportUrl } from "@/lib/api-client";
import { AppShell, Button, Card, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [mcpToken, setMcpToken] = useState<{ token: string; expiresIn: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerateToken() {
    setGenerating(true);
    try {
      setMcpToken(await generateMcpToken());
    } finally {
      setGenerating(false);
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell>
      <PageHeader title="Settings" />

      <div className="section-stack">
        <Card title="Profile">
          <p>
            Signed in as <strong>{me.email}</strong>.
          </p>
        </Card>

        <Card title="Import">
          <p>
            <Link href="/import">Import a CSV of songs</Link>
          </p>
        </Card>

        <Card title="Export">
          <p>
            <a href={fullExportUrl()}>Download full JSON export</a> — every entity and relationship,
            suitable for backup or re-import into an empty instance.
          </p>
          <p>
            <a href={songsCsvExportUrl()}>Download songs as CSV</a>
          </p>
        </Card>

        <Card title="ChatGPT / MCP connector">
          <p className="text-muted">
            Generate a bearer token and paste it into ChatGPT&rsquo;s remote MCP connector settings
            (Authorization) along with this server&rsquo;s URL. The token expires and is shown only
            once — store it somewhere safe.
          </p>
          <Button onClick={handleGenerateToken} disabled={generating}>
            {generating ? "Generating…" : "Generate MCP token"}
          </Button>
          {mcpToken && (
            <div style={{ marginTop: "0.75rem" }}>
              <textarea
                readOnly
                value={mcpToken.token}
                rows={3}
                className="textarea"
                style={{ fontFamily: "monospace", fontSize: 12 }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <p className="text-faint" style={{ fontSize: 13 }}>
                Expires in {mcpToken.expiresIn}.
              </p>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
