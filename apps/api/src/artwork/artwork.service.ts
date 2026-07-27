import { Injectable, Logger } from "@nestjs/common";

export type ArtworkType = "song" | "album" | "artist";

/**
 * Looks up cover art by name via the iTunes Search API (free, keyless, broad coverage).
 * Results are cached in-memory (per API instance) so repeated card renders don't re-hit iTunes.
 * There is no persistence — the cache simply rewarms after a restart.
 */
@Injectable()
export class ArtworkService {
  private readonly logger = new Logger(ArtworkService.name);
  private readonly cache = new Map<string, string | null>();

  async lookup(type: ArtworkType, artist: string, title?: string): Promise<string | null> {
    const key = `${type}:${artist.toLowerCase()}:${(title ?? "").toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const url = this.buildQuery(type, artist, title);
    let result: string | null = null;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Resonance/1.0 (personal music archive)" },
      });
      if (res.ok) {
        const data = (await res.json()) as { results?: { artworkUrl100?: string }[] };
        const raw = data.results?.find((r) => r.artworkUrl100)?.artworkUrl100;
        // iTunes returns a 100px thumbnail; request a larger crop of the same asset.
        result = raw ? raw.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1") : null;
      }
    } catch (err) {
      this.logger.warn(`Artwork lookup failed for "${key}": ${String(err)}`);
      result = null;
    }

    this.cache.set(key, result);
    return result;
  }

  private buildQuery(type: ArtworkType, artist: string, title?: string): string {
    const base = "https://itunes.apple.com/search";
    // For artists, iTunes has no reliable artist image, so we use their top album's cover.
    const entity = type === "song" ? "song" : "album";
    const term = type === "artist" ? artist : `${artist} ${title ?? ""}`.trim();
    const params = new URLSearchParams({
      term,
      entity,
      limit: "1",
      media: "music",
    });
    return `${base}?${params.toString()}`;
  }
}
