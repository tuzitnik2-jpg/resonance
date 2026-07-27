# ADR-0008: AI provider abstraction over OpenAI's Responses API

## Status

Accepted

## Context

The design doc requires AI/model logic to sit behind a swappable provider interface ("Model je
nahraditelný": OpenAI is the preferred integration layer, but the domain and database must not
depend on one model) and recommends the OpenAI Responses API for new work (§9.1, §7.2).

## Decision

- `packages/ai` defines an `AIProvider` interface (`analyzeSong(input): Promise<AnalysisResult>`)
  with no OpenAI-specific types leaking into its signature.
- `OpenAIProvider` implements it by calling `POST /v1/responses` directly via `fetch` (no SDK
  dependency), requesting a `json_schema`-constrained `text.format` so the result parses straight
  into a `SongAnalysis` row without prompt-engineering the shape.
- `createAIProvider(env)` picks `OpenAIProvider` when `OPENAI_API_KEY` is set, otherwise
  `UnconfiguredProvider`, which throws a typed `AIProviderUnavailableError` rather than fabricating
  an analysis. The API layer maps that error to `503 Service Unavailable` with a clear message
  (never a bare `500`), so "AI isn't configured" is visibly different from "something broke."
- The system prompt (`DEFAULT_ASSISTANT_INSTRUCTIONS`) and per-analysis-type task text
  (`ANALYSIS_TASK_PROMPTS`) are seeded into `prompt_versions` (§9.3/§9.4) so they're versioned and
  editable without a code change, per the doc's `PromptVersion` entity.
- Untrusted, user-controlled content (the song's own note) is always sent as a separate `user`-role
  message, never concatenated into the `developer`-role instructions — see
  `packages/ai/src/openai-provider.test.ts` for the regression test that pins this down as a
  prompt-injection defense.

## Consequences

- No AI SDK dependency to track; the request/response shape is hand-rolled against the Responses
  API as documented in July 2026 — **must be re-verified against current OpenAI docs before
  production use**, since this endpoint's shape has changed before and may again (flagged
  identically in the source design doc's own Appendix D).
- Swapping providers later (Anthropic, a local model, etc.) means adding one more class next to
  `OpenAIProvider` and one branch in `createAIProvider` — the rest of the app never touches
  provider-specific types.
