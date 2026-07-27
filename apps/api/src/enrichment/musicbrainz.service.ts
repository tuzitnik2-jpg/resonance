import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

const MUSICBRAINZ_BASE_URL = "https://musicbrainz.org/ws/2";
// MusicBrainz's API is free and keyless but requires a descriptive User-Agent (their usage
// policy) and a courteous request rate — see docs/architecture/enrichment.md.
const USER_AGENT = "Resonance/0.1.0 (personal music archive; contact via project repository)";

export interface MusicBrainzArtistMatch {
  id: string;
  name: string;
  score: number;
  country?: string;
  disambiguation?: string;
}

@Injectable()
export class MusicBrainzService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async searchArtists(query: string): Promise<MusicBrainzArtistMatch[]> {
    const url = `${MUSICBRAINZ_BASE_URL}/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      throw new Error(`MusicBrainz search failed (${res.status}).`);
    }
    const data = (await res.json()) as {
      artists: {
        id: string;
        name: string;
        score: number;
        country?: string;
        disambiguation?: string;
      }[];
    };
    return data.artists.map((a) => ({
      id: a.id,
      name: a.name,
      score: a.score,
      country: a.country,
      disambiguation: a.disambiguation,
    }));
  }

  /** Looks up the best MusicBrainz match for an artist and, if confident, records its MBID. */
  async enrichArtist(artistId: string, user: AuthenticatedUser) {
    const artist = await this.prisma.artist.findFirst({ where: { id: artistId, deletedAt: null } });
    if (!artist) {
      throw new NotFoundException(`Artist ${artistId} not found.`);
    }

    const matches = await this.searchArtists(artist.canonicalName);
    const best = matches[0];
    // Only auto-attach on a high-confidence exact-ish match; otherwise return candidates for
    // the user to pick from manually (never guess silently -- doc §"Ověřitelnost před kreativitou").
    if (!best || best.score < 90) {
      return { attached: false, candidates: matches };
    }

    const updated = await this.prisma.artist.update({
      where: { id: artistId },
      data: { musicbrainzId: best.id },
    });

    await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "enrich",
      entityType: "artist",
      entityId: artistId,
      beforeJson: artist,
      afterJson: updated,
    });

    return { attached: true, artist: updated, candidates: matches };
  }
}
