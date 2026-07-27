# Resonance — Architecture Overview

Resonance is a personal music knowledge system. The database (PostgreSQL, via Prisma) is the
source of truth; a web app is the editor/admin UI; ChatGPT accesses the same data through a
dedicated MCP server. See the source design document, "RESONANCE — Software Architecture &
Product Design Document v1.0," for the full product vision, domain model, and long-term roadmap.
This directory documents what's actually built.

**Status**: Phases 0-5 from the doc's roadmap are all implemented to some degree — core library
CRUD, personal context (memories/festivals/playlists), in-app AI analysis, an MCP server for
ChatGPT, and enrichment (MusicBrainz, link verification, stats). See each phase's section below
for exactly what that means and what's still a stub.

## Packages

- `apps/web` — Next.js editor/admin UI. Talks to `apps/api` over HTTP; never touches the database
  directly.
- `apps/api` — NestJS REST API (`/api/v1/*`). The only write path to the database; owns
  validation, deduplication, and the audit log.
- `apps/mcp` — stateless remote MCP server for ChatGPT. No database access of its own — every
  tool call is an HTTP request to `apps/api`. See `mcp.md`.
- `packages/domain` — framework-free types, Zod validation helpers, `normalizeName()`, partial-date
  utilities. Shared by `apps/api`.
- `packages/db` — Prisma schema, migrations, and seed script (admin user + default AI prompt version).
- `packages/shared` — cross-cutting DTOs (RFC 7807 problem details, cursor pagination) shared by
  web and api.
- `packages/ai` — the `AIProvider` abstraction and `OpenAIProvider` implementation. See ADR-0008.

## Request flow

`apps/web` → HTTP (cookie session) → `apps/api` (NestJS controllers → services → Prisma) →
PostgreSQL. `apps/mcp` → HTTP (bearer token) → `apps/api`, using the exact same controllers —
there is no separate MCP-only code path for reads or writes. Every mutation flows through the
API's service layer, which is responsible for writing an `AuditEvent` alongside the primary
change.

See `data-model.md` for the schema, `api-conventions.md` for the API's conventions (pagination,
error format, auth, and — importantly — which conventions from the source doc are _not_ yet
implemented), `mcp.md` for the MCP server, and `enrichment.md` for Phase 5.

## What each phase actually delivered

- **Phase 0/1 (bootstrap + core library)**: full CRUD on songs/artists/albums/tags, two-phase CSV
  import, full JSON/CSV export, audit log.
- **Phase 2 (personal context)**: memories, festivals + lineup with computed schedule collisions,
  playlists, external links.
- **Phase 3 (AI inside Resonance)**: `packages/ai`'s provider abstraction, a real OpenAI Responses
  API implementation (untested against a live key in this environment — see ADR-0008), draft/approve
  workflow for AI analyses, an "AI Inbox" UI, and a golden-set of eval tests that check the
  _backend guarantees_ the source doc's conversational evals depend on (duplicate detection,
  no fabrication, confirmation-before-write) — see `apps/api/test/eval-golden-set.e2e-spec.ts`.
- **Phase 4 (ChatGPT MCP)**: all 15 tools from the doc's §10.2, bearer-token auth (ADR-0009), tool
  annotations, no delete/remove tool exposed. Not yet tested against a live ChatGPT connector —
  only against raw JSON-RPC and the SDK's in-memory test transport.
- **Phase 5 (enrichment)**: MusicBrainz lookup (live, working), external link verification,
  festival schedule collisions, library stats. Spotify sync is a deliberate stub (ADR-0010).
