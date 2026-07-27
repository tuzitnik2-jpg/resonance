# ADR-0004: Soft-delete convention, and audit-log append-only enforcement

## Status

Accepted

## Context

The design document requires soft delete on main entities ("hard delete only via an explicit
admin action") and an append-only audit log ("every AI/user change has an author, timestamp,
before value, and after value").

## Decision

- `Artist`, `Album`, `Song`, and `Tag` get a nullable `deletedAt` timestamp. All service-layer
  reads filter `deletedAt: null` by default; an explicit `includeDeleted` flag (admin-only,
  Phase 2+) is required to see soft-deleted rows. Hard delete is a separate, explicit operation —
  not implemented in Phase 0/1 at all, matching the design document's MVP threat model ("do not
  expose a delete MCP tool in the first version").
- Join/personal-data rows (`SongUserData`, `SongTag`, `SongArtist`) are hard-deleted on removal
  (there's no meaningful "soft-deleted tag attachment" state), but every removal still emits an
  `AuditEvent` capturing the `before_json`, so the change is recoverable from history even though
  the row itself is gone.
- `AuditEvent` is append-only by **application-layer discipline only**: a single `AuditService`
  is the only code path allowed to write to `audit_events`, and it only ever calls `.create()`.

## Consequences, and a correction to an earlier version of this ADR

A DB-level `REVOKE UPDATE, DELETE ON audit_events FROM CURRENT_USER` migration **is** now
implemented (`20260722085701_audit_events_append_only`), as one further layer under the
application-layer discipline above. An earlier version of this ADR argued against adding it,
on the claim that "the table owner always bypasses ACL checks regardless of GRANT/REVOKE." That
claim was tested directly and is **incorrect** as a general statement: per PostgreSQL's own docs,
an owner's ordinary DML privileges (SELECT/INSERT/UPDATE/DELETE) are real, revocable grants —
revoking them from the owner does block that owner's direct DML. What actually makes the revoke a
no-op in **local development** is that `docker-compose`'s bootstrap `POSTGRES_USER` is a Postgres
**superuser**, and superusers bypass every ACL check unconditionally — that's a different and much
narrower fact than "owners always bypass ACL," and it verified by hand (`UPDATE audit_events ...`
via `psql -U resonance` succeeded despite the revoke, purely because that role is a superuser here).

Net effect: the revoke is inert in this repo's default local setup, but is real, load-bearing
protection the moment the app is deployed against a hosted Postgres where the app's connection
role is _not_ a superuser (true of most managed providers — Render, Railway, Supabase, RDS
non-superuser accounts) — which is exactly the NFR the source doc asks for ("oddělená oprávnění
pro čtení a zápis"). A genuinely enforced-in-local-dev version would need a second, non-owner
role used only by the running app while migrations run as the owner — still not implemented, and
still the right next step if multi-user access or stronger tamper-resistance is ever required.
