import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { songsToCsv } from "../imports/csv";

/** Schema version for the full JSON export; bump when the export shape changes in an incompatible way. */
const EXPORT_SCHEMA_VERSION = 1;

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async fullExport(user: AuthenticatedUser) {
    const [
      artists,
      albums,
      songs,
      songArtists,
      tags,
      songTags,
      songUserData,
      memories,
      festivals,
      festivalPerformances,
      playlists,
      playlistItems,
      externalLinks,
      songAnalyses,
    ] = await Promise.all([
      this.prisma.artist.findMany({ where: { deletedAt: null } }),
      this.prisma.album.findMany({ where: { deletedAt: null } }),
      this.prisma.song.findMany({ where: { deletedAt: null } }),
      this.prisma.songArtist.findMany(),
      this.prisma.tag.findMany({ where: { deletedAt: null } }),
      this.prisma.songTag.findMany(),
      this.prisma.songUserData.findMany({ where: { userId: user.userId } }),
      this.prisma.memory.findMany({ where: { userId: user.userId, deletedAt: null } }),
      this.prisma.festival.findMany({ where: { deletedAt: null } }),
      this.prisma.festivalPerformance.findMany(),
      this.prisma.playlist.findMany({ where: { userId: user.userId, deletedAt: null } }),
      this.prisma.playlistItem.findMany(),
      this.prisma.externalLink.findMany(),
      this.prisma.songAnalysis.findMany(),
    ]);

    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      artists,
      albums,
      songs,
      songArtists,
      tags,
      songTags,
      songUserData,
      memories,
      festivals,
      festivalPerformances,
      playlists,
      playlistItems,
      externalLinks,
      songAnalyses,
    };
  }

  async songsCsv() {
    const songs = await this.prisma.song.findMany({
      where: { deletedAt: null },
      include: {
        primaryArtist: true,
        album: true,
        userData: true,
        songTags: { include: { tag: true } },
      },
      orderBy: { title: "asc" },
    });
    return songsToCsv(songs);
  }
}
