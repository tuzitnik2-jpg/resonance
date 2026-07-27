# API Conventions

Base path: `/api/v1`.

## Errors

Every error response is `application/problem+json` (RFC 7807), produced by the global
`ProblemDetailsExceptionFilter` (`apps/api/src/common/filters/problem-details.filter.ts`):

```json
{
  "type": "about:blank",
  "title": "UnauthorizedException",
  "status": 401,
  "detail": "...",
  "instance": "/api/v1/me"
}
```

Errors that mean "not configured" rather than "broken" use `503 Service Unavailable` with a
specific `detail` message (see the AI provider and Spotify sync sections below) — never a bare
`500` for an expected, actionable condition.

## Auth

Two ways to authenticate, both producing the same `AuthenticatedUser` (`{ userId, email }`) via
`AuthGuard`:

- **Session cookie** (`resonance_session`, httpOnly, `SameSite=Lax`, JWT-signed), issued by
  `POST /api/v1/auth/login` for the web app. See ADR-0005.
- **Bearer token** (`Authorization: Bearer <jwt>`), minted by `POST /api/v1/auth/mcp-token` (itself
  cookie-authenticated) for `apps/mcp` and other machine clients. See ADR-0009.

Every route requires one of the two except ones marked `@Public()` (`/health`, `/auth/login`).

## Conventions actually followed

- Cursor pagination on list endpoints (`packages/shared`'s `CursorPage<T>`/`CursorPageQuery`).
- Every write response includes an `auditEventId` (or `auditEventId: null` when nothing changed,
  e.g. a duplicate-create that returned the existing row).
- Filtering via explicit query parameters only — no raw query/SQL passthrough.
- Soft delete via `deletedAt`; no delete endpoint exists for join/personal-data rows or for
  anything reachable through MCP (see ADR-0004, ADR-0009).
- Duplicate detection on create (`Artist`/`Album`/`Song`) by normalized name/title: a repeat
  create returns the existing row with `created: false` and a `duplicateWarning`, not a second
  record. Pass `force: true` to create a separate record anyway.

## Conventions the source doc calls for that are **not** implemented

Flagged here so they're not assumed to exist:

- **`Idempotency-Key` header** (§8.1) — not implemented. The normalized-name duplicate detection
  above covers the _content_ dedup case ("don't create the same song twice"), but not the
  _exactly-once-delivery_ case (a client retrying the same POST after a dropped response). Add a
  short-TTL `(key -> response)` cache if MCP/ChatGPT retries turn out to double-submit in practice.
- **`updated_at`/`If-Match` optimistic locking** (§8.1) — not implemented. Concurrent edits last-write-wins.

## Implemented endpoint groups (Phases 0-5)

| Resource                                           | Routes                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/health`, `/auth/*`, `/me`                        | Liveness, login/logout, MCP token minting, current user.                                         |
| `/artists`, `/albums`, `/songs`                    | Full CRUD (list/get/create/update/delete) with duplicate detection.                              |
| `/songs/:id/tags`                                  | Attach/detach a tag.                                                                             |
| `/songs/:id/user-data`                             | Personal rating/favorite/note/energy (PATCH only — no list/delete).                              |
| `/songs/:id/analyses*`                             | List, manually propose, or AI-generate (`/generate`) a draft analysis.                           |
| `/analyses/pending`, `/:id/approve`, `/:id/reject` | The "AI Inbox" review workflow.                                                                  |
| `/tags`                                            | Full CRUD.                                                                                       |
| `/memories`                                        | Full CRUD, filterable by `entityType`/`entityId`.                                                |
| `/festivals`, `/:id/performances`                  | Full CRUD; the festival brief includes lineup, priority order, and computed schedule collisions. |
| `/playlists`, `/:id/items`                         | Full CRUD; items are ordered.                                                                    |
| `/external-links`, `/:id/verify`                   | Create/list/delete a link; verify re-checks reachability.                                        |
| `/imports`, `/:id/commit`                          | Two-phase CSV import: analyze (preview + duplicate/error detection), then commit.                |
| `/exports/full`, `/exports/songs.csv`              | Full JSON export (backup/re-import) and a songs CSV export.                                      |
| `/context`                                         | Compact, cacheable snapshot for starting an AI conversation (§8.4).                              |
| `/enrichment/musicbrainz/*`                        | Live MusicBrainz artist search + attach.                                                         |
| `/enrichment/spotify/status`                       | Reports whether Spotify sync is configured (it isn't, by design — ADR-0010).                     |
| `/stats`                                           | Library stats: songs by decade, top tags, top favorite artists.                                  |
| `/audit`                                           | Read-only audit trail, filterable by `entityType`/`entityId`.                                    |
