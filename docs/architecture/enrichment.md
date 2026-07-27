# Enrichment (Phase 5)

Covers the source doc's §12.3/§17.6 "Enrichment" items. See ADR-0010 for the Spotify decision.

## MusicBrainz (implemented)

`MusicBrainzService` (`apps/api/src/enrichment/musicbrainz.service.ts`) calls MusicBrainz's public
search API directly — it's free and requires no API key, only a descriptive `User-Agent` header
per [their usage policy](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting). Be a good
citizen if you extend this: keep requests infrequent and keep the `User-Agent` accurate.

- `GET /api/v1/enrichment/musicbrainz/search?query=...` — raw search, returns candidates with a
  match score.
- `POST /api/v1/enrichment/musicbrainz/artists/:artistId` — searches by the artist's canonical
  name and auto-attaches `musicbrainzId` only above a score-90 confidence threshold; below that it
  returns candidates for the user to pick from manually. Never guesses silently (source doc:
  "Ověřitelnost před kreativitou").

## Spotify (deferred, stubbed)

Not implemented — see ADR-0010. `GET /api/v1/enrichment/spotify/status` reports whether
`SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` are set; they never are by default. Manual Spotify
links work today via the general `external_links` table (see below) — that covers the MVP's
actual need without OAuth.

## External link verification (implemented)

`POST /api/v1/external-links/:id/verify` sends a `HEAD` request and stamps `verifiedAt` if it
resolves (2xx/3xx). A failed check never implies the linked entity doesn't exist — regional
availability and dead links are both possible, and the doc is explicit that absence-on-Spotify
must never be treated as absence-in-reality (§12.3).

## Festival schedule collisions (implemented)

The festival brief (`GET /api/v1/festivals/:id`) computes `collidesWith: string[]` on each
performance — other performance IDs at the same festival whose `startsAt`/`endsAt` ranges overlap.
Only performances with both times set participate; this is plain interval overlap, not a live
external call.

## Library stats (implemented)

`GET /api/v1/stats` returns songs-by-decade, top tags by usage, and top favorite artists — all
computed from local data, no external calls.

## Not built (out of scope, per the doc)

Semantic search/embeddings: explicitly deferred by the source doc itself ("Ne v MVP; PostgreSQL
fulltext a tagy budou pravděpodobně stačit," §20) — nothing here needs it yet.
