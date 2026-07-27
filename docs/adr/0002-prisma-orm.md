# ADR-0002: Prisma as ORM and migration tool

## Status

Accepted

## Context

Resonance's design document lists Prisma as the recommended ORM alongside SQLAlchemy+Alembic
(for a Python stack). Having chosen TypeScript end-to-end (ADR-0001), Prisma is the natural
counterpart: a schema-first tool with integrated migrations and a fully-typed generated client.

## Decision

Use Prisma (`packages/db`) as the single source of truth for the database schema
(`prisma/schema.prisma`), migrations (`prisma/migrations/`), and the generated type-safe client
consumed by `apps/api`.

## Consequences

- Schema changes are reviewed as a diff to `schema.prisma` plus a generated SQL migration file,
  rather than hand-written SQL or a separate migration DSL.
- The generated `PrismaClient` gives compile-time-checked queries, reducing a class of runtime
  bugs in the API layer.
- Prisma's schema currently pins to v5.x; a note is left in `packages/db/package.json` context
  when a major-version upgrade (Prisma 6/7) becomes worth doing — not required for Phase 0/1.
- Raw/complex SQL (e.g. full-text search, later `pgvector` usage) will need `$queryRaw`/
  `$executeRaw` escape hatches; acceptable trade-off for the type-safety gained elsewhere.
