# ADR-0010: Spotify sync stays a stub until manual use proves it's needed

## Status

Accepted

## Context

The design doc marks Spotify sync as "Could" priority and explicitly says to defer it "dokud
ruční práce neprokáže konkrétní potřebu" (§12.3, §17.6, §20).

## Decision

`SpotifyService.isConfigured()` checks for `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`;
`assertConfigured()` throws a `ServiceUnavailableException` with a clear message otherwise. No
OAuth flow, token storage, or track-matching logic is implemented — `GET /enrichment/spotify/status`
exists only so the web UI (and any future MCP tool) can show real status instead of guessing.

MusicBrainz lookup, by contrast, **is** fully implemented (`MusicBrainzService`,
`POST /enrichment/musicbrainz/artists/:id`) since MusicBrainz's API is free and keyless — there was
no reason to defer it the way Spotify's OAuth requirement forces.

## Consequences

- Manually-entered Spotify links (`ExternalLink` rows with `provider: "spotify"`) already work today
  via the general external-links API and are verifiable via `POST /external-links/:id/verify` — the
  MVP's actual Spotify need (a clickable, checkable link) is met without OAuth.
- The absence of a song on Spotify must never be treated as proof it doesn't exist (§12.3) — nothing
  in the codebase currently makes that inference, and this ADR is the place to check first if that
  temptation comes up later.
- When real sync is built, `SpotifyService` is the seam: it gets real methods, `isConfigured()`
  stays the gate, and callers (API routes, MCP tools) don't need to change their error handling
  since they already treat "not configured" as an expected, user-facing state.
