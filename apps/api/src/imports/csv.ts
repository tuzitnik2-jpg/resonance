/** Parses RFC 4180-ish CSV text (quoted fields, escaped quotes, CRLF/LF) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // skip; \n (if present) drives the row break
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

export interface CsvSongRow {
  trackName: string;
  artistName: string;
  /** Additional artists beyond the primary one (e.g. features), Spotify-export imports only. */
  featuredArtists?: string[];
  albumName?: string;
  releaseYear?: number;
  releaseMonth?: number;
  releaseDay?: number;
  releasePrecision?: "YEAR" | "MONTH" | "DAY";
  durationMs?: number;
  isrc?: string;
  spotifyUrl?: string;
  rating?: number;
  favorite?: boolean;
  note?: string;
  tags?: string[];
  dateAdded?: string;
}

const COLUMN_MAP: Record<string, keyof CsvSongRow> = {
  track_name: "trackName",
  artist_name: "artistName",
  album_name: "albumName",
  release_year: "releaseYear",
  spotify_url: "spotifyUrl",
  rating: "rating",
  favorite: "favorite",
  note: "note",
  tags: "tags",
  date_added: "dateAdded",
};

export interface CsvParseResult {
  rows: CsvSongRow[];
  errors: { rowIndex: number; message: string }[];
  sourceFormat: "resonance" | "spotify_export";
}

/**
 * Column headers exactly as produced by Spotify playlist CSV exports (e.g. Exportify), a
 * "Track URI,Track Name,Artist URI(s),Artist Name(s),Album URI,Album Name,Album Artist
 * URI(s),Album Artist Name(s),Album Release Date,Album Image URL,Disc Number,Track
 * Number,Track Duration (ms),Track Preview URL,Explicit,Popularity,ISRC,Added By,Added At"
 * header row. Matching is case-insensitive and whitespace-trimmed.
 */
const SPOTIFY_EXPORT_COLUMN_MAP: Record<string, string> = {
  "track uri": "trackUri",
  "track name": "trackName",
  "artist name(s)": "artistNames",
  "album name": "albumName",
  "album release date": "albumReleaseDate",
  "track duration (ms)": "durationMs",
  isrc: "isrc",
  "added at": "addedAt",
};

const SPOTIFY_EXPORT_REQUIRED_COLUMNS = ["track uri", "track name", "artist name(s)"];

function isSpotifyExportHeader(header: string[]): boolean {
  return SPOTIFY_EXPORT_REQUIRED_COLUMNS.every((col) => header.includes(col));
}

/** Parses an "Album Release Date" cell (YYYY-MM-DD, YYYY-MM, or YYYY) into year/month/day/precision. */
function parseSpotifyReleaseDate(value: string): {
  releaseYear?: number;
  releaseMonth?: number;
  releaseDay?: number;
  releasePrecision?: "YEAR" | "MONTH" | "DAY";
} {
  if (!value) return {};
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value.trim());
  if (!match) return {};
  const [, y, m, d] = match;
  if (d) {
    return { releaseYear: Number(y), releaseMonth: Number(m), releaseDay: Number(d), releasePrecision: "DAY" };
  }
  if (m) {
    return { releaseYear: Number(y), releaseMonth: Number(m), releasePrecision: "MONTH" };
  }
  return { releaseYear: Number(y), releasePrecision: "YEAR" };
}

function spotifyTrackUriToUrl(uri: string): string | undefined {
  const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(uri.trim());
  return match ? `https://open.spotify.com/track/${match[1]}` : undefined;
}

/** Maps rows from a native Spotify/Exportify playlist CSV export (exact Spotify column headers). */
function mapSpotifyExportRows(table: string[][], header: string[]): CsvParseResult {
  const rows: CsvSongRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const raw: Record<string, string> = {};
    header.forEach((colName, idx) => {
      const field = SPOTIFY_EXPORT_COLUMN_MAP[colName];
      if (field) raw[field] = (cells[idx] ?? "").trim();
    });

    if (!raw.trackName) {
      errors.push({ rowIndex: i, message: "Missing required column Track Name." });
      continue;
    }
    if (!raw.artistNames) {
      errors.push({ rowIndex: i, message: "Missing required column Artist Name(s)." });
      continue;
    }

    const artistList = raw.artistNames
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const [artistName, ...featuredArtists] = artistList;

    rows.push({
      trackName: raw.trackName,
      artistName,
      featuredArtists: featuredArtists.length > 0 ? featuredArtists : undefined,
      albumName: raw.albumName || undefined,
      ...parseSpotifyReleaseDate(raw.albumReleaseDate ?? ""),
      durationMs: raw.durationMs ? Number(raw.durationMs) : undefined,
      isrc: raw.isrc || undefined,
      spotifyUrl: raw.trackUri ? spotifyTrackUriToUrl(raw.trackUri) : undefined,
      dateAdded: raw.addedAt || undefined,
    });
  }

  return { rows, errors, sourceFormat: "spotify_export" };
}

/**
 * Two-phase CSV import, step one: map columns and validate rows without writing anything.
 * Auto-detects the Resonance CSV format vs. a native Spotify playlist export and parses
 * accordingly, so a Spotify export can be dropped in unmodified.
 */
export function mapCsvRows(text: string): CsvParseResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: [{ rowIndex: 0, message: "The file is empty." }], sourceFormat: "resonance" };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());

  if (isSpotifyExportHeader(header)) {
    return mapSpotifyExportRows(table, header);
  }

  const rows: CsvSongRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const raw: Record<string, string> = {};
    header.forEach((colName, idx) => {
      const field = COLUMN_MAP[colName];
      if (field) raw[field] = (cells[idx] ?? "").trim();
    });

    if (!raw.trackName) {
      errors.push({ rowIndex: i, message: "Missing required column track_name." });
      continue;
    }
    if (!raw.artistName) {
      errors.push({ rowIndex: i, message: "Missing required column artist_name." });
      continue;
    }

    rows.push({
      trackName: raw.trackName,
      artistName: raw.artistName,
      albumName: raw.albumName || undefined,
      releaseYear: raw.releaseYear ? Number(raw.releaseYear) : undefined,
      spotifyUrl: raw.spotifyUrl || undefined,
      rating: raw.rating ? Number(raw.rating) : undefined,
      favorite: raw.favorite ? /^(true|1|yes)$/i.test(raw.favorite) : undefined,
      note: raw.note || undefined,
      tags: raw.tags
        ? raw.tags
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      dateAdded: raw.dateAdded || undefined,
    });
  }

  return { rows, errors, sourceFormat: "resonance" };
}

export function songsToCsv(
  songs: {
    title: string;
    primaryArtist: { canonicalName: string };
    album: { title: string } | null;
    releaseYear: number | null;
    userData: { rating: number | null; favorite: boolean; userNote: string | null }[];
    songTags: { tag: { name: string } }[];
  }[],
): string {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const header = [
    "track_name",
    "artist_name",
    "album_name",
    "release_year",
    "rating",
    "favorite",
    "note",
    "tags",
  ];
  const lines = [header.join(",")];

  for (const song of songs) {
    const userData = song.userData[0];
    lines.push(
      [
        escape(song.title),
        escape(song.primaryArtist.canonicalName),
        escape(song.album?.title ?? ""),
        song.releaseYear?.toString() ?? "",
        userData?.rating?.toString() ?? "",
        userData?.favorite ? "true" : "false",
        escape(userData?.userNote ?? ""),
        escape(song.songTags.map((st) => st.tag.name).join(";")),
      ].join(","),
    );
  }

  return lines.join("\n");
}
