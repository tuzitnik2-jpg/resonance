# Resonance

Osobní hudební archiv a inteligentní průvodce moderní hudbou. See the source design document,
"RESONANCE — Software Architecture & Product Design Document v1.0," for the full product vision;
`docs/architecture/` and `docs/adr/` document what's actually implemented.

**Status**: Phases 0-5 from the doc's roadmap are all implemented — core library CRUD, personal
context (memories/festivals/playlists), in-app AI analysis, an MCP server for ChatGPT, and
enrichment. Nothing here has been tested against a live OpenAI key or a real ChatGPT connector —
see `docs/architecture/overview.md`'s "What each phase actually delivered" for the honest per-phase
status and known gaps.

## Stack

TypeScript end-to-end: Next.js (`apps/web`) + NestJS (`apps/api`) + an MCP server (`apps/mcp`) +
Prisma/PostgreSQL 16 (`packages/db`). See `docs/adr/` for why.

## Local setup

```bash
cp .env.example .env          # edit SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD as desired
pnpm install
docker compose up -d db
pnpm --filter @resonance/db exec prisma migrate deploy
pnpm --filter @resonance/db run seed
pnpm run dev                  # starts web (:3000), api (:3001), and mcp (:3002)
```

Log in at `http://localhost:3000`. To exercise the API directly instead:

```bash
curl -i -c cookies.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<SEED_ADMIN_EMAIL>","password":"<SEED_ADMIN_PASSWORD>"}'
curl -i -b cookies.txt http://localhost:3001/api/v1/me
```

### Optional: AI-generated analyses

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in `.env` before starting the API. Without
it, `POST /songs/:id/analyses/generate` returns a `503` with a clear message — manually proposing
an analysis (`POST /songs/:id/analyses`) and the rest of the app work fine regardless.

### Optional: connect ChatGPT via MCP

See `docs/architecture/mcp.md`. Short version: Settings → Generate MCP token in the web app, then
point ChatGPT's remote MCP connector at `http://<host>:3002/mcp` with that token as the bearer.

## Common commands

```bash
pnpm run lint            # eslint across all packages
pnpm run typecheck       # tsc --noEmit across all packages
pnpm run test            # unit tests
pnpm run test:e2e        # NestJS e2e tests against a real Postgres (needs `docker compose up -d db`)
pnpm run build           # production build of every package
pnpm run format          # prettier --write .
```

## Repo layout

```
apps/
  web/      # Next.js editor/admin UI
  api/      # NestJS REST API
  mcp/      # MCP server for ChatGPT (stateless, no direct DB access)
packages/
  domain/   # framework-free types, validation, normalizeName()
  db/       # Prisma schema, migrations, seed
  shared/   # shared DTOs (RFC 7807 errors, pagination)
  ai/       # AIProvider abstraction + OpenAI Responses API implementation
docs/
  architecture/   # overview, data model, API conventions, MCP, enrichment
  adr/            # architectural decision records
```
