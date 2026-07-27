-- ADR-0004: audit_events is append-only. Revoke UPDATE/DELETE from the connecting
-- role so a stray .update()/.delete() call fails fast at the DB layer instead of
-- silently corrupting the audit trail. The owning role can still re-GRANT itself
-- these privileges (Postgres does not fully lock out an owner) -- for a personal
-- MVP this is a safety rail against application bugs, not a cryptographic guarantee.
REVOKE UPDATE, DELETE ON TABLE "audit_events" FROM CURRENT_USER;
