# Resonance

Personal music knowledge system. The **database is the source of truth**; AI is an
interpretation layer on top of it, never a place where facts are invented. See the
Software Architecture & Product Design Document for the full spec.

This repo currently contains **Phase 0 (Project Bootstrap)** + the complete database
schema. No CRUD/API business logic yet — that is Phase 1.

## Stack

TypeScript end-to-end (doc §7.2): Next.js (web), NestJS (api), Prisma + PostgreSQL 16,
official MCP SDK (later). One language across web / backend / MCP.

## Layout (doc §16.1)

```
apps/
  web/        Next.js editor & admin UI        (Phase 1)
  api/        NestJS backend + MCP-shared services
  mcp/        MCP adapter for ChatGPT          (Phase 4)
packages/
  db/         Prisma schema, migrations, seed, shared client
  domain/     types, use-cases, validation
  ai/         prompts, provider interface, evals (Phase 3)
  shared/     shared DTOs & utilities
```

## Quick start (Phase 0)

```bash
# 1. Install deps (needs pnpm + Node 22)
pnpm install

# 2. Env
cp .env.example .env         # then edit RESONANCE_API_TOKEN etc.

# 3. Start Postgres
pnpm docker:db               # docker compose up -d db

# 4. Generate client + create schema
pnpm db:generate
pnpm db:migrate              # first run names the migration, e.g. "init"

# 5. Seed non-secret starter data (tag taxonomy, festivals 2026, sample song)
pnpm db:seed

# 6. Run the API
pnpm api:dev                 # http://localhost:8000/api/v1/health
```

Health checks: `GET /api/v1/health` and `GET /api/v1/health/db`.

## Design rules baked into the schema (doc §6.3)

- UUID keys everywhere; sequential ids never exposed.
- Normalized names on artist/song/tag for duplicate detection.
- Incomplete release dates via `releasePrecision` (YEAR / MONTH / DAY).
- Rating 1..10, nullable; **AI must never modify user data**.
- Analyses are versioned (new row + status), never overwritten.
- Soft delete (`deletedAt`) on main entities; **audit_events is append-only**.
- All timestamps stored UTC (UI renders Europe/Prague).

## Auth

Phase 0 uses a single static bearer token (`RESONANCE_API_TOKEN`) via
`BearerAuthGuard`, per doc §10.3. OAuth 2.1 / OIDC with scopes replaces it in Phase 4.
`/health` is public.

## Roadmap (doc §17)

0. **Bootstrap** — repo, Docker, DB schema, auth stub  ← *you are here*
1. Core Library MVP — CRUD, ratings/notes, tags, CSV import, JSON/CSV export, audit
2. Personal context — memories, festivals, playlists, dance/Reels
3. AI inside Resonance — provider abstraction, analysis drafts, approval inbox
4. ChatGPT MCP — read tools, OAuth, write approvals
5. Enrichment — link verification, MusicBrainz, optional Spotify, embeddings if needed

## Next step

Phase 1: implement song/artist/album CRUD + CSV import preview on top of this schema.
Every write must create an `AuditEvent`. Keep user data and AI analyses separate.
