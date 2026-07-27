import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

/** Backs the "Statistiky hudební historie" enrichment item (source doc §17.6, Phase 5). */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: AuthenticatedUser) {
    const [songs, tagCounts, favoriteSongs] = await Promise.all([
      this.prisma.song.findMany({
        where: { deletedAt: null },
        select: { releaseYear: true },
      }),
      this.prisma.songTag.groupBy({
        by: ["tagId"],
        _count: { tagId: true },
        orderBy: { _count: { tagId: "desc" } },
        take: 10,
      }),
      this.prisma.songUserData.findMany({
        where: { userId: user.userId, favorite: true },
        include: { song: { include: { primaryArtist: true } } },
      }),
    ]);

    const byDecade = new Map<string, number>();
    for (const song of songs) {
      if (!song.releaseYear) continue;
      const decade = `${Math.floor(song.releaseYear / 10) * 10}s`;
      byDecade.set(decade, (byDecade.get(decade) ?? 0) + 1);
    }

    const tagIds = tagCounts.map((t) => t.tagId);
    const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
    const tagById = new Map(tags.map((t) => [t.id, t]));

    const artistFavoriteCounts = new Map<string, { name: string; count: number }>();
    for (const data of favoriteSongs) {
      const artist = data.song.primaryArtist;
      const entry = artistFavoriteCounts.get(artist.id) ?? { name: artist.canonicalName, count: 0 };
      entry.count++;
      artistFavoriteCounts.set(artist.id, entry);
    }

    return {
      totalSongs: songs.length,
      songsByDecade: Object.fromEntries(byDecade),
      topTags: tagCounts
        .map((t) => ({ tag: tagById.get(t.tagId)?.name, count: t._count.tagId }))
        .filter((t) => t.tag),
      topFavoriteArtists: [...artistFavoriteCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}
