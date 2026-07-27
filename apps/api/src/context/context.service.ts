import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

/**
 * Backs GET /api/v1/context (source design doc §8.4): a small, cacheable snapshot for
 * starting a conversation, not the whole database. Detail is fetched with targeted tools.
 */
@Injectable()
export class ContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(user: AuthenticatedUser) {
    const [
      recentSongs,
      activeFestivals,
      favoriteArtistData,
      pendingAnalysesCount,
      songCount,
      artistCount,
      albumCount,
    ] = await Promise.all([
      this.prisma.song.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { primaryArtist: true },
      }),
      this.prisma.festival.findMany({
        where: { deletedAt: null, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        orderBy: { startDate: "asc" },
        take: 5,
      }),
      this.prisma.songUserData.findMany({
        where: { userId: user.userId, favorite: true },
        include: { song: { include: { primaryArtist: true } } },
        take: 20,
      }),
      this.prisma.songAnalysis.count({ where: { status: "DRAFT" } }),
      this.prisma.song.count({ where: { deletedAt: null } }),
      this.prisma.artist.count({ where: { deletedAt: null } }),
      this.prisma.album.count({ where: { deletedAt: null } }),
    ]);

    const favoriteArtistNames = [
      ...new Set(favoriteArtistData.map((d) => d.song.primaryArtist.canonicalName)),
    ].slice(0, 10);

    return {
      recentSongs: recentSongs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.primaryArtist.canonicalName,
      })),
      activeFestivals: activeFestivals.map((f) => ({
        id: f.id,
        name: f.name,
        startDate: f.startDate,
      })),
      favoriteArtists: favoriteArtistNames,
      pendingProposalsCount: pendingAnalysesCount,
      libraryStats: { songs: songCount, artists: artistCount, albums: albumCount },
    };
  }
}
