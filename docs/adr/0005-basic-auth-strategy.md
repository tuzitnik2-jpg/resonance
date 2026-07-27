# ADR-0005: Single-seeded-user auth strategy

## Status

Accepted

## Context

The design document's Phase 0 deliverables include "basic authentication," while its own
principles emphasize simplicity over scope for a personal, single-user MVP. Full multi-user auth
(self-service signup, email verification, password reset flows, roles/permissions, OAuth) would be
over-engineering for a system built for exactly one person.

## Decision

- Exactly one `User` row exists, created by a seed script (`packages/db/prisma/seed.ts`) reading
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from the environment. There is no public signup
  endpoint.
- `POST /api/v1/auth/login` verifies the password (argon2id) and issues a signed JWT delivered as
  an `httpOnly`, `SameSite=Lax` cookie (`resonance_session`) — never returned in the JSON body, so
  it can't end up in browser storage or client-side logs.
- A global `AuthGuard` (`APP_GUARD`) protects every route except ones explicitly marked
  `@Public()` (`/health`, `/auth/login`).
- No refresh-token rotation, no session revocation list, no roles table. "Password reset" means
  rerunning the seed script with new env values.

## Consequences

- Significantly less code and no user-management UI needed for Phase 0/1.
- If Resonance ever needs a second real user, this needs revisiting — the current model has
  exactly one `User` row referenced implicitly in a few places and no signup flow at all. That's
  an intentional, documented limitation, not an oversight.
- The JWT secret (`JWT_SECRET`) is the only credential-adjacent secret in play; it lives in
  server-side environment variables only (never shipped to `apps/web`).
