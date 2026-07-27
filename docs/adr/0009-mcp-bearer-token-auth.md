# ADR-0009: MCP authentication starts with a bearer token, not OAuth 2.1

## Status

Accepted

## Context

The design doc's target state for MCP auth is OAuth 2.1/OIDC with PKCE and per-scope tokens
(§10.3), but explicitly allows starting simpler: "Pro osobní použití lze začít krátkodobým bearer
tokenem uloženým v bezpečném nastavení konektoru."

## Decision

- `apps/mcp` is a stateless remote MCP server (one `McpServer` + `StreamableHTTPServerTransport`
  per HTTP request, no session state) that never talks to Postgres directly — every tool call is a
  `fetch` to the same REST API the web app uses, forwarding the caller's bearer token as-is
  (§10.1: "MCP vrstva je tenký adaptér nad stejnou aplikační vrstvou").
- The API's existing session JWT mechanism is reused rather than building a second auth system:
  `AuthGuard` now accepts `Authorization: Bearer <jwt>` as an alternative to the session cookie,
  and a new `POST /api/v1/auth/mcp-token` (itself cookie-authenticated, exposed in the web app's
  Settings page) mints a JWT with a shorter, configurable expiry (`MCP_TOKEN_EXPIRES_IN`, default
  7 days) for the user to paste into ChatGPT's remote-MCP connector "Authorization" field.
- Per the doc's threat model (§13.1: "V MVP neposkytovat delete MCP tool"), no delete/remove tool
  is registered at all. Every read tool is annotated `readOnlyHint: true`; every write tool is
  annotated `destructiveHint: false` (none of them can destroy data) so a well-behaved client can
  apply its own approval policy (OpenAI's remote-MCP `require_approval` setting) on top.
- AI-proposed analyses stay `DRAFT` until `approve_analysis`/`approve` is called explicitly — this
  _is_ the "always confirm write operations" mechanism for that specific write path, rather than a
  separate confirmation-token scheme.

## Consequences

- One shared token per user, not per-scope (no separate `resonance.read`/`resonance.write` split
  yet) — acceptable for a single-user personal MVP, and the doc's own recommended starting point.
- No revocation list: a leaked token is valid until it expires. Rotating `JWT_SECRET` invalidates
  every token including the web session cookie, which is the only revocation lever right now.
- Upgrading to OAuth 2.1/PKCE with real scopes remains the target state and is unchanged by this
  ADR — this documents the MVP starting point, not the ceiling.
