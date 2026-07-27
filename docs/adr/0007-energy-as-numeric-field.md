# ADR-0007: Energy modeled as a numeric field, not a Tag

## Status

Accepted

## Context

The design document's tag taxonomy table lists `energy` alongside `genre`, `theme`, `mood`,
`dance`, `usage`, and `language` as one of the tag categories, but explicitly annotates it
differently from the others: "Numerical value 1–10, not just a text tag." Modeling it the same
way as the other categories would mean creating ten `Tag` rows per user, one for each energy
level ("1" through "10"), which is an awkward fit for a controlled vocabulary table and loses the
fact that energy is an ordered scale, not a label.

## Decision

Model energy as a nullable `energyLevel Int` (1–10) column directly on `SongUserData` — alongside
`rating`, which is a numeric personal-attribute in the same shape — rather than as `Tag` rows.
The other six categories (`genre`, `theme`, `mood`, `dance`, `usage`, `language`) remain modeled
as `Tag` rows with a `TagCategory` enum.

## Consequences

- Filtering/sorting by energy is a plain numeric column comparison (`energyLevel >= 7`), not a
  join through `song_tags`.
- The `TagCategory` enum in `schema.prisma` has six values, not seven — this is intentional and
  matches the design document's own note about energy being numeric, not a discrepancy to "fix"
  later.
- If a future need arises for energy to support AI-provided values with a `source`/`confidence`
  the way tags do, that would mean adding those fields to `SongUserData` (or a small dedicated
  table) rather than reusing `SongTag`, to preserve the numeric-scale semantics.
