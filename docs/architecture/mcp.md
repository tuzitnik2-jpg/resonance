# MCP server (`apps/mcp`)

Implements the source design doc's §10 ("MCP Integration for ChatGPT"). See ADR-0009 for the
authentication decision.

## What it is

A stateless remote MCP server: one `McpServer` instance and one `StreamableHTTPServerTransport`
per incoming HTTP request, with no session state kept between requests. It has **no direct
database access and no business logic** — every tool call is a `fetch` to the same Resonance REST
API the web app uses, forwarding the caller's bearer token as-is. Duplicate detection, audit
logging, and the draft/approve workflow are enforced exactly once, in the API.

## Running it locally

```bash
pnpm --filter mcp run dev        # or: docker compose up mcp
```

Listens on `MCP_PORT` (default 3002), calling the API at `RESONANCE_API_URL` (default
`http://localhost:3001`).

## Connecting a client

1. Log into the web app, go to **Settings → ChatGPT / MCP connector**, click **Generate MCP
   token**. Copy it immediately — it's shown once.
2. In ChatGPT's remote MCP connector settings, set the server URL to your MCP server's `/mcp`
   endpoint and the Authorization header to `Bearer <token>`.
3. Test locally without ChatGPT using any MCP client, or raw JSON-RPC:

   ```bash
   curl -s http://localhost:3002/mcp \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

## Tools

All 15 tools from the source doc's §10.2 table are implemented in `apps/mcp/src/server.ts`. Per
the doc's threat model (§13.1: "V MVP neposkytovat delete MCP tool"), **no delete/remove tool is
registered** — `apps/mcp/src/server.test.ts` asserts this stays true. Read tools are annotated
`readOnlyHint: true`; write tools are annotated `destructiveHint: false` (none of them destroy
data) so a well-behaved client can layer its own approval policy on top (OpenAI's remote-MCP
`require_approval` connector setting).

| Tool                    | Read/Write | Notes                                                                                                                                          |
| ----------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_music_context`     | Read       | Calls `GET /context` — call this first to orient.                                                                                              |
| `search_songs`          | Read       |                                                                                                                                                |
| `get_song`              | Read       |                                                                                                                                                |
| `create_song`           | Write      | Duplicate detection happens in the API, not here.                                                                                              |
| `update_song_metadata`  | Write      |                                                                                                                                                |
| `update_song_user_data` | Write      | Personal data — summarize and confirm before calling.                                                                                          |
| `add_memory`            | Write      |                                                                                                                                                |
| `propose_song_analysis` | Write      | Always creates a `DRAFT` — never authoritative until approved.                                                                                 |
| `approve_analysis`      | Write      |                                                                                                                                                |
| `search_artists`        | Read       |                                                                                                                                                |
| `get_festival_brief`    | Read       | Includes computed schedule collisions.                                                                                                         |
| `create_playlist_draft` | Write      |                                                                                                                                                |
| `add_playlist_items`    | Write      | Loops the API's single-item endpoint; accepts up to 50 song IDs.                                                                               |
| `get_pending_changes`   | Read       | The "AI Inbox".                                                                                                                                |
| `export_user_data`      | Write      | Returns entity **counts** only — never streams a full personal-data dump through the model context. Full download stays a web-app-only action. |

## A TypeScript gotcha worth knowing about

`@modelcontextprotocol/sdk`'s `registerTool()` generics accept both Zod v3 and v4 schemas via an
internal compat layer. Importing tool schemas from the plain `"zod"` entrypoint (rather than the
`"zod/v3"` subpath) makes every single `registerTool()` call blow up TypeScript's type-checker —
`tsc` runs out of memory or reports "Type instantiation is excessively deep and possibly
infinite," even for one trivial tool. `apps/mcp/src/server.ts` imports from `"zod/v3"`
specifically; don't "fix" that import back to `"zod"`.

## Known limitations

- No `Idempotency-Key` support (see `docs/architecture/api-conventions.md`) — a client retrying a
  dropped `create_song` call could create a second record if the first actually succeeded
  server-side. Duplicate-name detection covers the common case but not this one.
- Auth is a single long-lived bearer token per user, not OAuth 2.1 with per-scope tokens (ADR-0009).
