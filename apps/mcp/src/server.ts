import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Import the zod/v3 subpath specifically (not the "zod" | "zod/v4" union) — mixing the SDK's
// zod3|zod4-compat generics with the plain "zod" entrypoint causes catastrophic TS type-checking
// blowup ("Type instantiation is excessively deep") on every registerTool() call.
import { z } from "zod/v3";
import { ResonanceClient } from "./resonance-client";

/**
 * Builds one MCP server instance per incoming HTTP request, scoped to that request's bearer
 * token. This mirrors the Resonance API itself: the MCP layer is a thin adapter with no
 * authorization or business logic of its own (source design doc §10.1) — every tool below just
 * calls the same REST endpoints the web app uses, so duplicate detection, audit logging, and
 * draft/approve workflows are enforced exactly once, in the API.
 *
 * Per the doc's threat model (§13.1: "V MVP neposkytovat delete MCP tool"), no delete/remove
 * operations are exposed here at all — only reads and non-destructive creates/updates.
 */
export function buildServer(bearerToken: string): McpServer {
  const api = new ResonanceClient(bearerToken);
  const server = new McpServer({ name: "resonance", version: "0.1.0" });

  server.registerTool(
    "get_music_context",
    {
      title: "Get music context",
      description:
        "Compact, cacheable snapshot of the user's library: recent songs, active festivals, " +
        "favorite artists, pending AI proposals, and basic library stats. Call this first to " +
        "orient before other tools.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: "text", text: JSON.stringify(await api.get("/context")) }] }),
  );

  server.registerTool(
    "search_songs",
    {
      title: "Search songs",
      description: "Search/filter songs already in the library. Never invents results.",
      inputSchema: {
        query: z.string().optional(),
        artistId: z.string().uuid().optional(),
        tagId: z.string().uuid().optional(),
        favorite: z.boolean().optional(),
        minRating: z.number().int().min(1).max(10).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) search.set(key, String(value));
      }
      const result = await api.get(`/songs?${search.toString()}`);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "get_song",
    {
      title: "Get song",
      description: "Full detail for one song: metadata, personal data, tags, and analyses.",
      inputSchema: { songId: z.string().uuid() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ songId }) => ({
      content: [{ type: "text", text: JSON.stringify(await api.get(`/songs/${songId}`)) }],
    }),
  );

  server.registerTool(
    "create_song",
    {
      title: "Create song",
      description:
        "Adds a song after checking for duplicates. If a duplicate is found the existing song " +
        "is returned with a warning instead of creating a second record — never override this " +
        "with force unless the user explicitly confirms they want a separate entry.",
      inputSchema: {
        title: z.string().min(1).max(300),
        primaryArtistId: z.string().uuid(),
        albumId: z.string().uuid().optional(),
        releaseYear: z.number().int().min(1900).max(2100).optional(),
        force: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify(await api.post("/songs", args)) }],
    }),
  );

  server.registerTool(
    "update_song_metadata",
    {
      title: "Update song metadata",
      description:
        "Edits objective song data (title, album, release date, etc.) — not personal data.",
      inputSchema: {
        songId: z.string().uuid(),
        title: z.string().min(1).max(300).optional(),
        albumId: z.string().uuid().optional(),
        releaseYear: z.number().int().min(1900).max(2100).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ songId, ...body }) => ({
      content: [{ type: "text", text: JSON.stringify(await api.patch(`/songs/${songId}`, body)) }],
    }),
  );

  server.registerTool(
    "update_song_user_data",
    {
      title: "Update personal song data",
      description:
        "Updates the user's own rating, favorite flag, energy, or note. This is personal data — " +
        "always summarize the change and get explicit confirmation before calling this.",
      inputSchema: {
        songId: z.string().uuid(),
        rating: z.number().int().min(1).max(10).nullable().optional(),
        energyLevel: z.number().int().min(1).max(10).nullable().optional(),
        favorite: z.boolean().optional(),
        userNote: z.string().max(4000).nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ songId, ...body }) => ({
      content: [
        { type: "text", text: JSON.stringify(await api.patch(`/songs/${songId}/user-data`, body)) },
      ],
    }),
  );

  server.registerTool(
    "add_memory",
    {
      title: "Add memory",
      description:
        "Attaches a personal memory (a moment, story, or context) to a song, artist, or festival.",
      inputSchema: {
        entityType: z.enum(["song", "artist", "album", "festival"]),
        entityId: z.string().uuid(),
        title: z.string().min(1).max(200),
        body: z.string().max(4000).optional(),
        occurredOn: z.string().date().optional(),
        location: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify(await api.post("/memories", args)) }],
    }),
  );

  server.registerTool(
    "propose_song_analysis",
    {
      title: "Propose song analysis",
      description:
        "Records an AI-generated analysis (meaning, style, mood, dance, reels, festival fit, or " +
        "collection pick) as a DRAFT. Drafts never become authoritative until approve_analysis is " +
        "called — always separate verified facts from interpretation in the summary.",
      inputSchema: {
        songId: z.string().uuid(),
        analysisType: z.enum([
          "MEANING",
          "STYLE",
          "MOOD_ENERGY",
          "DANCE",
          "REELS",
          "FESTIVAL",
          "COLLECTION",
        ]),
        summary: z.string().max(4000).optional(),
        structuredData: z.record(z.unknown()),
        confidence: z.number().min(0).max(1).optional(),
        sources: z
          .array(z.object({ title: z.string(), url: z.string().url().optional() }))
          .optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ songId, ...body }) => ({
      content: [
        { type: "text", text: JSON.stringify(await api.post(`/songs/${songId}/analyses`, body)) },
      ],
    }),
  );

  server.registerTool(
    "approve_analysis",
    {
      title: "Approve analysis",
      description:
        "Approves a specific draft analysis, making it authoritative. Only call after explicit user confirmation.",
      inputSchema: { analysisId: z.string().uuid() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ analysisId }) => ({
      content: [
        { type: "text", text: JSON.stringify(await api.post(`/analyses/${analysisId}/approve`)) },
      ],
    }),
  );

  server.registerTool(
    "search_artists",
    {
      title: "Search artists",
      description: "Search artists already in the library.",
      inputSchema: {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) search.set(key, String(value));
      }
      return {
        content: [
          { type: "text", text: JSON.stringify(await api.get(`/artists?${search.toString()}`)) },
        ],
      };
    },
  );

  server.registerTool(
    "get_festival_brief",
    {
      title: "Get festival brief",
      description:
        "Lineup, priorities, and personal notes for a festival — use for festival-prep questions.",
      inputSchema: { festivalId: z.string().uuid() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ festivalId }) => ({
      content: [{ type: "text", text: JSON.stringify(await api.get(`/festivals/${festivalId}`)) }],
    }),
  );

  server.registerTool(
    "create_playlist_draft",
    {
      title: "Create playlist draft",
      description: "Creates a new internal playlist/collection, empty to start.",
      inputSchema: {
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify(await api.post("/playlists", args)) }],
    }),
  );

  server.registerTool(
    "add_playlist_items",
    {
      title: "Add playlist items",
      description: "Adds one or more existing songs to a playlist, in order.",
      inputSchema: {
        playlistId: z.string().uuid(),
        songIds: z.array(z.string().uuid()).min(1).max(50),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ playlistId, songIds }) => {
      const results = [];
      for (const songId of songIds) {
        results.push(await api.post(`/playlists/${playlistId}/items`, { songId }));
      }
      return { content: [{ type: "text", text: JSON.stringify({ items: results }) }] };
    },
  );

  server.registerTool(
    "get_pending_changes",
    {
      title: "Get pending changes",
      description:
        "Lists every AI-proposed analysis still awaiting approval or rejection (the AI Inbox).",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(await api.get("/analyses/pending")) }],
    }),
  );

  server.registerTool(
    "export_user_data",
    {
      title: "Export user data",
      description:
        "Returns entity counts for a full data export, as a safety check before the user downloads " +
        "the actual file from the web app's Settings page. Does not return raw personal data " +
        "through the model context.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      const full = await api.get<Record<string, unknown>>("/exports/full");
      const counts = Object.fromEntries(
        Object.entries(full)
          .filter(([, v]) => Array.isArray(v))
          .map(([k, v]) => [k, (v as unknown[]).length]),
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              note: "Download the full export from Settings in the web app; this tool only returns counts.",
              counts,
            }),
          },
        ],
      };
    },
  );

  return server;
}
