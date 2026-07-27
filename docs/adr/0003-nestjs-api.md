# ADR-0003: NestJS as the API framework

## Status

Accepted

## Context

The design document calls for a clean separation between an API layer, an application/use-case
layer, and infrastructure — and notes that a future MCP server (Phase 4) should be "a thin adapter
over the same application layer used by the web API," not a second implementation of the same
business rules. Plain Express (or colocating everything in Next.js API routes) would work for
Phase 0/1's endpoint count, but would blur that seam and make DI/testing of services harder as the
domain grows into Phase 2+.

## Decision

Use NestJS (`apps/api`) as a dedicated backend service, with modules/controllers/services/guards
structured so the future MCP server can import and call the same `*.service.ts` classes (or thin
wrappers around them) instead of re-implementing validation, deduplication, and audit logic.

## Consequences

- Slightly more ceremony up front (modules, DI, decorators) than a minimal Express app, but a
  testable, swappable-transport service layer from day one.
- `apps/web` (Next.js) stays a pure UI/editor client that calls the API over HTTP — it does not
  reach into the database or domain packages directly, keeping the API as the single write path
  and audit chokepoint (matches the design document's "database is the source of truth, AI/UI are
  clients of it" principle).
- Standard NestJS testing tools (`@nestjs/testing`) are used for e2e tests against a real Postgres
  instance rather than a mocked repository layer, catching schema/query issues early.
