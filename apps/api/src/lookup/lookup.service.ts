import { Injectable, Logger } from "@nestjs/common";

export type LookupType = "song" | "album" | "artist";

interface ITunesResult {
  previewUrl?: string;
  artworkUrl100?: string;
}

/**
 * Thin client over the iTunes Search API (free, keyless): resolves 30-second audio previews and
 * cover-art URLs by name. Results are cached in-memory per API instance.
 */
@Injectable()
export class LookupService {
  private readonly logger = new Logger(LookupService.name);
  private readonly cache = new Map<string, ITunesResult | null>();

  private async query(entity: "song" | "album", term: string): Promise<ITunesResult | null> {
    const key = `${entity}:${term.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    let result: ITunesResult | null = null;
    try {
      const params = new URLSearchParams({ term, entity, limit: "1", media: "music" });
      const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`, {
        headers: { "User-Agent": "Resonance/1.0 (personal music archive)" },
      });
      if (res.ok) {
        const data = (await res.json()) as { results?: ITunesResult[] };
        result = data.results?.[0] ?? null;
      }
    } catch (err) {
      this.logger.warn(`iTunes lookup failed for "${key}": ${String(err)}`);
    }
    this.cache.set(key, result);
    return result;
  }

  /** A playable 30-second preview URL for a song, or null. */
  async previewUrl(artist: string, title: string): Promise<string | null> {
    const r = await this.query("song", `${artist} ${title}`.trim());
    return r?.previewUrl ?? null;
  }

  /** A ~600px cover-art URL for an entity, or null. Artists fall back to their top album. */
  async artworkUrl(type: LookupType, artist: string, title?: string): Promise<string | null> {
    const entity = type === "song" ? "song" : "album";
    const term = type === "artist" ? artist : `${artist} ${title ?? ""}`.trim();
    const r = await this.query(entity, term);
    if (!r?.artworkUrl100) return null;
    return r.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1");
  }
}
