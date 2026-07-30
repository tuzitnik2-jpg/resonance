// Relative by default: requests go to this app's own origin and Next.js rewrites them to the
// API server-side (see next.config.js). This avoids cross-origin/cross-site cookie issues when
// the app is accessed through a forwarded dev URL. Set NEXT_PUBLIC_API_URL only if the API is
// genuinely served from a different public origin than this app.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  [extension: string]: unknown;
}

export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(
      problem ?? { type: "about:blank", title: res.statusText, status: res.status },
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface HealthStatus {
  status: "ok";
}

export async function getApiHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthStatus;
  } catch {
    return null;
  }
}

export type ImageEntity = "song" | "artist" | "album";

/** URL of an entity's uploaded image (served via the API proxy). `version` busts the cache. */
export function entityImageUrl(type: ImageEntity, id: string, version?: number): string {
  const suffix = version ? `?v=${version}` : "";
  return `${API_BASE_URL}/api/v1/images/${type}/${id}${suffix}`;
}

/** Upload/replace an entity's image. `data` is base64 (no data: prefix). */
export function setEntityImage(type: ImageEntity, id: string, data: string, mimeType: string) {
  return apiFetch<void>(`/images/${type}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ data, mimeType }),
  });
}

export function deleteEntityImage(type: ImageEntity, id: string) {
  return apiFetch<void>(`/images/${type}/${id}`, { method: "DELETE" });
}

/** Ask the API to fetch a cover suggestion (iTunes) and store it for this entity. */
export function suggestEntityImage(type: ImageEntity, id: string, artist: string, title?: string) {
  const search = new URLSearchParams({ artist });
  if (title) search.set("title", title);
  return apiFetch<{ applied: boolean }>(`/images/${type}/${id}/suggest?${search.toString()}`, {
    method: "POST",
  });
}

/** A playable 30-second preview URL for a song (iTunes), or null. */
export function getPreviewUrl(artist: string, title: string) {
  const search = new URLSearchParams({ artist, title });
  return apiFetch<{ previewUrl: string | null }>(`/lookup/preview?${search.toString()}`);
}

export function askAssistant(question: string) {
  return apiFetch<{ answer: string }>("/assistant/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export interface Me {
  userId: string;
  email: string;
}

export function login(email: string, password: string) {
  return apiFetch<{ email: string; displayName: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiFetch<{ success: true }>("/auth/logout", { method: "POST" });
}

export function getMe() {
  return apiFetch<Me>("/me");
}

export type ArtistType = "PERSON" | "GROUP" | "OTHER";

export interface ArtistTag {
  artistId: string;
  tagId: string;
  tag: Tag;
}

export interface Artist {
  id: string;
  canonicalName: string;
  countryCode: string | null;
  artistType: ArtistType | null;
  originCity: string | null;
  beginDate: string | null;
  endDate: string | null;
  websiteUrl: string | null;
  description: string | null;
  musicbrainzId: string | null;
  createdAt: string;
  artistTags?: ArtistTag[];
}

export interface ArtistMetadataInput {
  canonicalName: string;
  countryCode: string | null;
  artistType: ArtistType | null;
  originCity: string | null;
  beginDate: string | null;
  endDate: string | null;
  websiteUrl: string | null;
  description: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface DuplicateWarning {
  existingId: string;
  message: string;
}

export interface LibraryContext {
  libraryStats: { songs: number; artists: number; albums: number; favorites: number };
  pendingProposalsCount: number;
}

/** Small cacheable snapshot of the library — real DB totals, not page lengths. */
export function getContext() {
  return apiFetch<LibraryContext>("/context");
}

export function listArtists(params: { query?: string; cursor?: string } = {}) {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.cursor) search.set("cursor", params.cursor);
  return apiFetch<CursorPage<Artist>>(`/artists?${search.toString()}`);
}

export function createArtist(input: { canonicalName: string; force?: boolean }) {
  return apiFetch<{ artist: Artist; created: boolean; duplicateWarning: DuplicateWarning | null }>(
    "/artists",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function getArtist(id: string) {
  return apiFetch<Artist>(`/artists/${id}`);
}

export function updateArtist(id: string, input: Partial<ArtistMetadataInput>) {
  return apiFetch<{ artist: Artist }>(`/artists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteArtist(id: string) {
  return apiFetch<void>(`/artists/${id}`, { method: "DELETE" });
}

export function attachArtistTag(artistId: string, tagId: string) {
  return apiFetch(`/artists/${artistId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

export function detachArtistTag(artistId: string, tagId: string) {
  return apiFetch<void>(`/artists/${artistId}/tags/${tagId}`, { method: "DELETE" });
}

export interface AlbumTag {
  albumId: string;
  tagId: string;
  tag: Tag;
}

export interface Album {
  id: string;
  artistId: string;
  title: string;
  releaseYear: number | null;
  label: string | null;
  artist?: Artist;
  albumTags?: AlbumTag[];
}

export function listAlbums(params: { artistId?: string; cursor?: string } = {}) {
  const search = new URLSearchParams();
  if (params.artistId) search.set("artistId", params.artistId);
  if (params.cursor) search.set("cursor", params.cursor);
  return apiFetch<CursorPage<Album>>(`/albums?${search.toString()}`);
}

export function createAlbum(input: {
  artistId: string;
  title: string;
  releaseYear?: number;
  force?: boolean;
}) {
  return apiFetch<{ album: Album; created: boolean; duplicateWarning: DuplicateWarning | null }>(
    "/albums",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function getAlbum(id: string) {
  return apiFetch<Album>(`/albums/${id}`);
}

export function updateAlbum(
  id: string,
  input: Partial<{ title: string; releaseYear: number | null; label: string | null }>,
) {
  return apiFetch<{ album: Album }>(`/albums/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function attachAlbumTag(albumId: string, tagId: string) {
  return apiFetch(`/albums/${albumId}/tags`, { method: "POST", body: JSON.stringify({ tagId }) });
}

export function detachAlbumTag(albumId: string, tagId: string) {
  return apiFetch<void>(`/albums/${albumId}/tags/${tagId}`, { method: "DELETE" });
}

export function deleteAlbum(id: string) {
  return apiFetch<void>(`/albums/${id}`, { method: "DELETE" });
}

export type TagCategory = "GENRE" | "THEME" | "MOOD" | "DANCE" | "USAGE" | "LANGUAGE";

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
}

export function listTags(category?: TagCategory) {
  const search = new URLSearchParams();
  if (category) search.set("category", category);
  return apiFetch<{ items: Tag[] }>(`/tags?${search.toString()}`);
}

export function createTag(input: { name: string; category: TagCategory; description?: string }) {
  return apiFetch<Tag>("/tags", { method: "POST", body: JSON.stringify(input) });
}

export function updateTag(
  id: string,
  input: Partial<{ name: string; description: string | null }>,
) {
  return apiFetch<{ tag: Tag }>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTag(id: string) {
  return apiFetch<void>(`/tags/${id}`, { method: "DELETE" });
}

export interface SongUserData {
  userId: string;
  songId: string;
  rating: number | null;
  energyLevel: number | null;
  favorite: boolean;
  status: "ACTIVE" | "ARCHIVED" | "WANT_TO_LISTEN";
  userNote: string | null;
  discoveredAt: string | null;
  discoverySource: string | null;
}

export interface SongTag {
  songId: string;
  tagId: string;
  source: string;
  tag: Tag;
}

export interface Song {
  id: string;
  title: string;
  primaryArtistId: string;
  albumId: string | null;
  releaseYear: number | null;
  bpm: number | null;
  musicalKey: string | null;
  label: string | null;
  primaryArtist?: Artist;
  album?: Album | null;
  songTags?: SongTag[];
  userData?: SongUserData[];
}

export interface SongMetadataInput {
  title: string;
  releaseYear: number | null;
  bpm: number | null;
  musicalKey: string | null;
  label: string | null;
}

export function updateSong(id: string, input: Partial<SongMetadataInput>) {
  return apiFetch<{ song: Song }>(`/songs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function listSongs(
  params: {
    query?: string;
    artistId?: string;
    albumId?: string;
    tagId?: string;
    favorite?: boolean;
    minRating?: number;
    cursor?: string;
  } = {},
) {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.artistId) search.set("artistId", params.artistId);
  if (params.albumId) search.set("albumId", params.albumId);
  if (params.tagId) search.set("tagId", params.tagId);
  if (params.favorite !== undefined) search.set("favorite", String(params.favorite));
  if (params.minRating !== undefined) search.set("minRating", String(params.minRating));
  if (params.cursor) search.set("cursor", params.cursor);
  return apiFetch<CursorPage<Song>>(`/songs?${search.toString()}`);
}

export function getSong(id: string) {
  return apiFetch<Song>(`/songs/${id}`);
}

export function createSong(input: {
  title: string;
  primaryArtistId: string;
  albumId?: string;
  releaseYear?: number;
  force?: boolean;
}) {
  return apiFetch<{ song: Song; created: boolean; duplicateWarning: DuplicateWarning | null }>(
    "/songs",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateSongUserData(
  id: string,
  input: Partial<{
    rating: number | null;
    energyLevel: number | null;
    favorite: boolean;
    userNote: string | null;
  }>,
) {
  return apiFetch<{ userData: SongUserData }>(`/songs/${id}/user-data`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function attachTag(songId: string, tagId: string) {
  return apiFetch(`/songs/${songId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

export function detachTag(songId: string, tagId: string) {
  return apiFetch(`/songs/${songId}/tags/${tagId}`, { method: "DELETE" });
}

export function deleteSong(id: string) {
  return apiFetch<void>(`/songs/${id}`, { method: "DELETE" });
}

// ---------- Imports / exports ----------

export interface ImportJob {
  id: string;
  filename: string;
  status: "PENDING" | "ANALYZED" | "COMMITTING" | "COMMITTED" | "FAILED";
  summaryJson: {
    totalRows: number;
    validRows: number;
    errors: { rowIndex: number; message: string }[];
    preview: {
      rowIndex: number;
      trackName: string;
      artistName: string;
      albumName?: string;
      duplicate: boolean;
    }[];
    committed?: boolean;
    songsCreated?: number;
    duplicatesSkipped?: number;
    commitErrors?: { rowIndex: number; message: string }[];
  };
}

export function analyzeImport(filename: string, csvContent: string) {
  return apiFetch<ImportJob>("/imports", {
    method: "POST",
    body: JSON.stringify({ filename, csvContent }),
  });
}

export function commitImport(id: string) {
  return apiFetch<ImportJob>(`/imports/${id}/commit`, { method: "POST" });
}

export function fullExportUrl() {
  return `${API_BASE_URL}/api/v1/exports/full`;
}

export function songsCsvExportUrl() {
  return `${API_BASE_URL}/api/v1/exports/songs.csv`;
}

// ---------- Memories ----------

export interface Memory {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  body: string | null;
  occurredOn: string | null;
  location: string | null;
  visibility: "PRIVATE" | "SHARED";
}

export function listMemories(params: { entityType?: string; entityId?: string } = {}) {
  const search = new URLSearchParams();
  if (params.entityType) search.set("entityType", params.entityType);
  if (params.entityId) search.set("entityId", params.entityId);
  return apiFetch<{ items: Memory[] }>(`/memories?${search.toString()}`);
}

export function createMemory(input: {
  entityType: string;
  entityId: string;
  title: string;
  body?: string;
  occurredOn?: string;
  location?: string;
}) {
  return apiFetch<{ memory: Memory }>("/memories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteMemory(id: string) {
  return apiFetch<void>(`/memories/${id}`, { method: "DELETE" });
}

// ---------- Festivals ----------

export interface FestivalPerformance {
  id: string;
  artistId: string;
  stage: string | null;
  startsAt: string | null;
  priority: number | null;
  attended: boolean;
  rating: number | null;
  note: string | null;
  endsAt?: string | null;
  /** IDs of other performances whose time slot overlaps this one (computed by the API). */
  collidesWith?: string[];
  artist: Artist;
}

export interface Festival {
  id: string;
  name: string;
  city: string | null;
  countryCode: string | null;
  startDate: string | null;
  endDate: string | null;
  websiteUrl: string | null;
  performances?: FestivalPerformance[];
}

export function listFestivals() {
  return apiFetch<CursorPage<Festival>>("/festivals");
}

export function getFestival(id: string) {
  return apiFetch<Festival>(`/festivals/${id}`);
}

export function createFestival(input: {
  name: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  websiteUrl?: string;
}) {
  return apiFetch<{ festival: Festival }>("/festivals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteFestival(id: string) {
  return apiFetch<void>(`/festivals/${id}`, { method: "DELETE" });
}

export function addFestivalPerformance(
  festivalId: string,
  input: { artistId: string; priority?: number; attended?: boolean; note?: string },
) {
  return apiFetch<{ performance: FestivalPerformance }>(`/festivals/${festivalId}/performances`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateFestivalPerformance(
  festivalId: string,
  performanceId: string,
  input: Partial<{ priority: number; attended: boolean; rating: number; note: string }>,
) {
  return apiFetch<{ performance: FestivalPerformance }>(
    `/festivals/${festivalId}/performances/${performanceId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function removeFestivalPerformance(festivalId: string, performanceId: string) {
  return apiFetch<void>(`/festivals/${festivalId}/performances/${performanceId}`, {
    method: "DELETE",
  });
}

// ---------- Playlists ----------

export interface PlaylistItem {
  playlistId: string;
  songId: string;
  position: number;
  reason: string | null;
  song: Song;
}

export interface SmartPlaylistRules {
  minRating?: number;
  favorite?: boolean;
  tagId?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

export interface Playlist {
  id: string;
  name: string;
  type: string;
  description: string | null;
  externalUrl: string | null;
  rulesJson?: SmartPlaylistRules | null;
  items?: PlaylistItem[];
  /** For smart playlists: the songs matching the rules, computed live by the API. */
  computed?: Song[] | null;
}

export function listPlaylists() {
  return apiFetch<{ items: Playlist[] }>("/playlists");
}

export function getPlaylist(id: string) {
  return apiFetch<Playlist>(`/playlists/${id}`);
}

export function createPlaylist(input: {
  name: string;
  description?: string;
  type?: string;
  rulesJson?: SmartPlaylistRules | null;
}) {
  return apiFetch<{ playlist: Playlist }>("/playlists", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deletePlaylist(id: string) {
  return apiFetch<void>(`/playlists/${id}`, { method: "DELETE" });
}

export function addPlaylistItem(playlistId: string, input: { songId: string; reason?: string }) {
  return apiFetch<{ item: PlaylistItem }>(`/playlists/${playlistId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removePlaylistItem(playlistId: string, songId: string) {
  return apiFetch<void>(`/playlists/${playlistId}/items/${songId}`, { method: "DELETE" });
}

// ---------- External links ----------

export interface ExternalLink {
  id: string;
  entityType: string;
  entityId: string;
  provider: string;
  url: string;
  verifiedAt: string | null;
}

export function listExternalLinks(entityType: string, entityId: string) {
  const search = new URLSearchParams({ entityType, entityId });
  return apiFetch<{ items: ExternalLink[] }>(`/external-links?${search.toString()}`);
}

export function createExternalLink(input: {
  entityType: string;
  entityId: string;
  provider: string;
  url: string;
}) {
  return apiFetch<{ link: ExternalLink }>("/external-links", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteExternalLink(id: string) {
  return apiFetch<void>(`/external-links/${id}`, { method: "DELETE" });
}

// ---------- AI analyses ----------

export type AnalysisType =
  "MEANING" | "STYLE" | "MOOD_ENERGY" | "DANCE" | "REELS" | "FESTIVAL" | "COLLECTION";

export interface SongAnalysis {
  id: string;
  songId: string;
  analysisType: AnalysisType;
  summary: string | null;
  contentJson: Record<string, unknown>;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  model: string | null;
  createdAt: string;
  song?: Song;
}

export function listSongAnalyses(songId: string) {
  return apiFetch<{ items: SongAnalysis[] }>(`/songs/${songId}/analyses`);
}

export function generateSongAnalysis(songId: string, analysisType: AnalysisType) {
  return apiFetch<{ analysis: SongAnalysis }>(`/songs/${songId}/analyses/generate`, {
    method: "POST",
    body: JSON.stringify({ analysisType }),
  });
}

export function listPendingAnalyses() {
  return apiFetch<{ items: SongAnalysis[] }>("/analyses/pending");
}

export function approveAnalysis(id: string) {
  return apiFetch<{ analysis: SongAnalysis }>(`/analyses/${id}/approve`, { method: "POST" });
}

export function rejectAnalysis(id: string) {
  return apiFetch<{ analysis: SongAnalysis }>(`/analyses/${id}/reject`, { method: "POST" });
}

export function generateMcpToken() {
  return apiFetch<{ token: string; expiresIn: string }>("/auth/mcp-token", { method: "POST" });
}

// ---------- Enrichment ----------

export interface MusicBrainzArtistMatch {
  id: string;
  name: string;
  score: number;
  country?: string;
  disambiguation?: string;
}

export function enrichArtistFromMusicBrainz(artistId: string) {
  return apiFetch<{ attached: boolean; artist?: Artist; candidates: MusicBrainzArtistMatch[] }>(
    `/enrichment/musicbrainz/artists/${artistId}`,
    { method: "POST" },
  );
}

export function verifyExternalLink(id: string) {
  return apiFetch<{ link: ExternalLink; reachable: boolean }>(`/external-links/${id}/verify`, {
    method: "POST",
  });
}

// ---------- Stats ----------

export interface LibraryStats {
  totalSongs: number;
  songsByDecade: Record<string, number>;
  topTags: { tag: string; count: number }[];
  topFavoriteArtists: { name: string; count: number }[];
}

export function getStats() {
  return apiFetch<LibraryStats>("/stats");
}
