# ADR-0001: TypeScript end-to-end

## Status

Accepted

## Context

Resonance's design document leaves the implementation language open, but recommends TypeScript
across frontend, backend, and future MCP server "if Claude/the developer implementing it is doing
the work, to keep one language across frontend/backend/future MCP." That is the case here: Claude
is scaffolding and will implement the majority of Phase 0/1, and a future MCP server (Phase 4)
will need to call into the same application/service layer as the REST API.

## Decision

Use TypeScript for every runtime package: the Next.js web app, the NestJS API, and all shared
packages (`domain`, `db`, `shared`). A future `apps/mcp` package will be TypeScript too, and will
reuse `packages/domain` and the API's service layer directly rather than re-implementing
validation/business rules in a second language.

## Consequences

- Type definitions, Zod validation schemas, and DTOs can be shared between `apps/web` and
  `apps/api` via `packages/domain` and `packages/shared`, without duplication or an API-contract
  drift risk.
- Only one toolchain (Node, pnpm, tsc/ESLint/Prettier) to maintain, appropriate for a solo
  developer project.
- Forecloses using a Python data/ML ecosystem library directly; if Resonance ever needs
  Python-only tooling (e.g. certain ML libraries for future recommendation features), it would run
  as a separate service behind an HTTP boundary rather than in-process.
