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
/**
 * LLM clients (e.g. ChatGPT) populate unspecified optional fields with `null` rather than omitting
 * them. Our zod schemas now accept null (.nullish()), but the Resonance API — and query strings —
 * must not receive nulls, so strip them here before every call.
 */
function clean<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}

/**
 * LLM / JSON-RPC clients routinely send optional values with the "wrong" JSON type: a number as the
 * string "25", a boolean as "true"/"false", or an empty string "" instead of omitting the field.
 * Plain .nullish() only tolerated null, so those still produced INVALID_ARGUMENT (e.g. ChatGPT
 * calling search_songs with limit:"25"). These coercing helpers accept those shapes, while the JSON
 * schema the client sees stays a clean number / boolean / uuid (zod renders the inner type).
 */
const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);
const toNumber = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : v === "" ? undefined : v;

const optStr = () => z.preprocess(emptyToUndef, z.string().nullish());
const optUuid = () => z.preprocess(emptyToUndef, z.string().uuid().nullish());
const optInt = (min: number, max: number) =>
  z.preprocess(toNumber, z.number().int().min(min).max(max).nullish());
const optNum = (min: number, max: number) =>
  z.preprocess(toNumber, z.number().min(min).max(max).nullish());
const optBool = () =>
  z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v === "" ? undefined : v),
    z.boolean().nullish(),
  );

/** Normalize a Spotify URI (spotify:track:ID) or URL into a valid https URL, else return null. */
function toSpotifyUrl(value: string): string | null {
  const uri = value.match(/^spotify:(track|album|artist):([A-Za-z0-9]+)$/);
  if (uri) return `https://open.spotify.com/${uri[1]}/${uri[2]}`;
  if (/^https?:\/\//.test(value)) return value;
  return null;
}

/** Derive the list of artist names from any of the accepted shapes (array, or comma-joined string). */
function toArtistNames(row: {
  artistNames?: string[] | null;
  artist?: string | null;
  artistName?: string | null;
}): string[] {
  if (row.artistNames && row.artistNames.length) {
    return row.artistNames.map((n) => n.trim()).filter(Boolean);
  }
  const joined = row.artist ?? row.artistName;
  if (joined)
    return joined
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
  return [];
}

type ArtistCache = Map<string, string>;

/** Resolve an artist name to an id — reusing an existing match or a same-run cache, else creating. */
async function resolveArtist(
  api: ResonanceClient,
  cache: ArtistCache,
  name: string,
): Promise<string> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  const found = (await api.get(`/artists?query=${encodeURIComponent(name)}`)) as {
    items: { id: string; canonicalName: string }[];
  };
  let id = found.items.find((a) => a.canonicalName.toLowerCase() === key)?.id;
  if (!id) {
    const created = (await api.post("/artists", { canonicalName: name })) as {
      artist: { id: string };
    };
    id = created.artist.id;
  }
  cache.set(key, id);
  return id;
}

interface UpsertRow {
  title: string;
  artistNames: string[];
  albumTitle?: string | null;
  releaseYear?: number | null;
  spotifyUri?: string | null;
}

/**
 * The core import step: resolve one or more artists by NAME (first = primary, the rest attached as
 * featured), resolve/create the album under the primary artist, create the song (with the API's
 * duplicate detection), and optionally attach a Spotify link.
 */
async function upsertSong(api: ResonanceClient, cache: ArtistCache, row: UpsertRow) {
  const names = row.artistNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("at least one artist name is required");

  const ids: string[] = [];
  for (const name of names) ids.push(await resolveArtist(api, cache, name));
  const [primaryArtistId, ...extraIds] = ids;

  let albumId: string | undefined;
  if (row.albumTitle) {
    const albums = (await api.get(`/albums?artistId=${primaryArtistId}`)) as {
      items: { id: string; title: string }[];
    };
    albumId = albums.items.find((a) => a.title.toLowerCase() === row.albumTitle!.toLowerCase())?.id;
    if (!albumId) {
      const created = (await api.post(
        "/albums",
        clean({ artistId: primaryArtistId, title: row.albumTitle, releaseYear: row.releaseYear }),
      )) as { album: { id: string } };
      albumId = created.album.id;
    }
  }

  const songResult = (await api.post(
    "/songs",
    clean({
      title: row.title,
      primaryArtistId,
      albumId,
      releaseYear: row.releaseYear,
      extraArtists: extraIds.length
        ? extraIds.map((artistId) => ({ artistId, role: "featured" }))
        : undefined,
    }),
  )) as { song?: { id: string }; created?: boolean };

  const url = row.spotifyUri ? toSpotifyUrl(row.spotifyUri) : null;
  if (url && songResult.song?.id) {
    await api
      .post("/external-links", {
        entityType: "song",
        entityId: songResult.song.id,
        provider: "spotify",
        url,
      })
      .catch(() => undefined);
  }

  return {
    songId: songResult.song?.id,
    created: songResult.created !== false,
    artistIds: ids,
    albumId,
  };
}

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
        query: optStr(),
        artistId: optUuid(),
        tagId: optUuid(),
        favorite: optBool(),
        minRating: optInt(1, 10),
        limit: optInt(1, 100),
        cursor: optStr(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(clean(args))) {
        search.set(key, String(value));
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
        albumId: optUuid(),
        releaseYear: optInt(1900, 2100),
        force: optBool(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify(await api.post("/songs", clean(args))) }],
    }),
  );

  server.registerTool(
    "create_artist",
    {
      title: "Create artist",
      description:
        "Adds an artist, with duplicate detection (an existing match is returned instead of a " +
        "duplicate). Optionally attaches a Spotify link.",
      inputSchema: {
        name: z.string().min(1).max(200),
        countryCode: z.preprocess(emptyToUndef, z.string().length(2).nullish()),
        spotifyUri: optStr(),
        force: optBool(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ name, countryCode, spotifyUri, force }) => {
      const result = (await api.post(
        "/artists",
        clean({ canonicalName: name, countryCode, force }),
      )) as { artist?: { id: string } };
      const url = spotifyUri ? toSpotifyUrl(spotifyUri) : null;
      if (url && result.artist?.id) {
        await api
          .post("/external-links", {
            entityType: "artist",
            entityId: result.artist.id,
            provider: "spotify",
            url,
          })
          .catch(() => undefined);
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "upsert_song_with_artists",
    {
      title: "Add a song, resolving artist(s) & album by name",
      description:
        "The import-friendly way to add ONE song: give the artist(s) and optional album by NAME. " +
        'Supply MULTIPLE artists via artistNames (e.g. ["Sara Lugo", "Protoje"]) — the first ' +
        "becomes the primary artist and the rest are attached as featured. Each artist/album is " +
        "reused if it already exists, else created; then the song is created (with duplicate " +
        "detection). Optionally records the release year and a Spotify link. To load many rows at " +
        "once, use import_songs instead.",
      inputSchema: {
        title: z.string().min(1).max(300),
        artistNames: z.array(z.string().min(1).max(200)).nullish(),
        artistName: optStr(),
        albumTitle: optStr(),
        releaseYear: optInt(1900, 2100),
        spotifyUri: optStr(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ title, artistNames, artistName, albumTitle, releaseYear, spotifyUri }) => {
      const names = toArtistNames({ artistNames, artistName });
      const result = await upsertSong(api, new Map(), {
        title,
        artistNames: names,
        albumTitle,
        releaseYear,
        spotifyUri,
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "import_songs",
    {
      title: "Bulk-import songs (e.g. a Spotify export)",
      description:
        "Imports many songs in one call. Each row gives the song by NAME(s) — multiple artists via " +
        'artistNames (array) OR artist (a comma-separated string like "Sara Lugo, Protoje", which ' +
        "is split automatically). The first artist is primary, the rest are featured. Artists and " +
        "albums are reused when they exist, else created; songs use the API's duplicate detection " +
        "(re-running is safe). Returns a per-row summary. Send at most ~50 rows per call and repeat " +
        "for large libraries.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              title: z.string().min(1).max(300),
              artistNames: z.array(z.string()).nullish(),
              artist: optStr(),
              albumTitle: optStr(),
              releaseYear: optInt(1900, 2100),
              spotifyUri: optStr(),
            }),
          )
          .min(1)
          .max(100),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ rows }) => {
      const cache: ArtistCache = new Map();
      const results: { title: string; status: string; songId?: string; error?: string }[] = [];
      for (const row of rows) {
        const names = toArtistNames(row);
        if (names.length === 0) {
          results.push({ title: row.title, status: "error", error: "no artist name" });
          continue;
        }
        try {
          const r = await upsertSong(api, cache, {
            title: row.title,
            artistNames: names,
            albumTitle: row.albumTitle,
            releaseYear: row.releaseYear,
            spotifyUri: row.spotifyUri,
          });
          results.push({
            title: row.title,
            status: r.created ? "created" : "duplicate",
            songId: r.songId,
          });
        } catch (err) {
          results.push({
            title: row.title,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      const summary = {
        total: results.length,
        created: results.filter((r) => r.status === "created").length,
        duplicates: results.filter((r) => r.status === "duplicate").length,
        errors: results.filter((r) => r.status === "error").length,
      };
      return { content: [{ type: "text", text: JSON.stringify({ summary, results }) }] };
    },
  );

  server.registerTool(
    "update_song_metadata",
    {
      title: "Update song metadata",
      description:
        "Edits objective song data (title, album, release date, etc.) — not personal data.",
      inputSchema: {
        songId: z.string().uuid(),
        title: optStr(),
        albumId: optUuid(),
        releaseYear: optInt(1900, 2100),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ songId, ...body }) => ({
      content: [
        { type: "text", text: JSON.stringify(await api.patch(`/songs/${songId}`, clean(body))) },
      ],
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
        rating: optInt(1, 10),
        energyLevel: optInt(1, 10),
        favorite: optBool(),
        userNote: optStr(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ songId, ...body }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await api.patch(`/songs/${songId}/user-data`, clean(body))),
        },
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
        body: optStr(),
        occurredOn: z.preprocess(emptyToUndef, z.string().date().nullish()),
        location: optStr(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify(await api.post("/memories", clean(args))) }],
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
        summary: optStr(),
        structuredData: z.record(z.unknown()),
        confidence: optNum(0, 1),
        sources: z
          .array(z.object({ title: z.string(), url: z.string().url().nullish() }))
          .nullish(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ songId, ...body }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(await api.post(`/songs/${songId}/analyses`, clean(body))),
        },
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
        query: optStr(),
        limit: optInt(1, 100),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(clean(args))) {
        search.set(key, String(value));
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
        description: optStr(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => ({
      content: [{ type: "text", text: JSON.stringify(await api.post("/playlists", clean(args))) }],
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
