# ADR-0006: pnpm workspaces + Turborepo for monorepo tooling

## Status

Accepted

## Context

The design document's suggested repo layout is a monorepo (`apps/*`, `packages/*`). A task
runner is needed to lint/typecheck/test/build across `apps/web`, `apps/api`, and the shared
packages without hand-rolling a script that walks every package.

## Decision

Use pnpm workspaces (`pnpm-workspace.yaml`) for dependency linking, and Turborepo (`turbo.json`)
to orchestrate `build`/`lint`/`typecheck`/`test`/`test:e2e`/`dev` across packages with caching and
dependency-aware ordering (`^build` before a package's own tasks). This was chosen over plain npm
workspaces (weaker caching, slower installs) and over Nx (heavier, more opinionated than a
personal project needs).

## Consequences

- Turborepo 2.x defaults to a **strict environment mode**: tasks only see environment variables
  explicitly declared in `turbo.json`'s `globalEnv` (or a task-level `env`), not the full parent
  shell environment. This was not obvious up front — `DATABASE_URL`, `JWT_SECRET`, and the other
  runtime env vars had to be added to `globalEnv` for `pnpm run test`/`test:e2e` to see them
  at all. Anyone adding a new environment variable that a task or its transitive dependencies read
  at runtime must add it to `turbo.json`'s `globalEnv`, or the task will silently fail to see it
  (Prisma's "Environment variable not found: DATABASE_URL" being the most likely symptom).
- `pnpm approve-builds` was run once to allow native postinstall scripts (`@prisma/client`,
  `@prisma/engines`, `argon2`, `@nestjs/core`, `esbuild`, `prisma`, `sharp`, `unrs-resolver`); the
  resulting `allowBuilds` block in `pnpm-workspace.yaml` is committed so CI and other machines get
  the same behavior without an interactive prompt.
