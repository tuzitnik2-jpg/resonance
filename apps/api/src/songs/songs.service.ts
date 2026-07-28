import { Injectable, NotFoundException } from "@nestjs/common";
import { normalizeName } from "@resonance/domain";
import type {
  CreateSongInput,
  SearchSongsQuery,
  UpdateSongInput,
  UpdateSongUserDataInput,
} from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { decodeCursor, encodeCursor } from "../common/pagination/cursor";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import type { DuplicateWarning } from "../artists/artists.service";

function releasePrecisionOf(
  year?: number,
  month?: number,
  day?: number,
): "YEAR" | "MONTH" | "DAY" | undefined {
  if (year === undefined) return undefined;
  if (day !== undefined && month !== undefined) return "DAY";
  if (month !== undefined) return "MONTH";
  return "YEAR";
}

const songInclude = (userId: string) => ({
  primaryArtist: true,
  album: true,
  songArtists: { include: { artist: true } },
  songTags: { include: { tag: true } },
  userData: { where: { userId } },
});

@Injectable()
export class SongsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateSongInput, user: AuthenticatedUser) {
    const normalizedTitle = normalizeName(input.title);

    if (!input.force) {
      const existing = await this.prisma.song.findFirst({
        where: {
          primaryArtistId: input.primaryArtistId,
          normalizedTitle,
          deletedAt: null,
        },
      });
      if (existing) {
        return {
          song: existing,
          created: false,
          duplicateWarning: {
            existingId: existing.id,
            message: `A song titled "${existing.title}" by this artist already exists. Pass force=true to create a separate record anyway.`,
          } satisfies DuplicateWarning,
          auditEventId: null,
        };
      }
    }

    const song = await this.prisma.song.create({
      data: {
        title: input.title,
        normalizedTitle,
        primaryArtistId: input.primaryArtistId,
        albumId: input.albumId,
        releaseYear: input.releaseYear,
        releaseMonth: input.releaseMonth,
        releaseDay: input.releaseDay,
        releasePrecision: releasePrecisionOf(
          input.releaseYear,
          input.releaseMonth,
          input.releaseDay,
        ),
        durationMs: input.durationMs,
        languageCode: input.languageCode,
        isrc: input.isrc,
        bpm: input.bpm,
        musicalKey: input.musicalKey,
        label: input.label,
        songArtists: input.extraArtists
          ? {
              create: input.extraArtists.map((extra) => ({
                artistId: extra.artistId,
                role: extra.role,
              })),
            }
          : undefined,
      },
      include: songInclude(user.userId),
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "song",
      entityId: song.id,
      afterJson: song,
    });

    return { song, created: true, duplicateWarning: null, auditEventId };
  }

  async findAll(query: SearchSongsQuery, user: AuthenticatedUser) {
    const limit = query.limit ?? 25;
    const cursorId = decodeCursor(query.cursor);

    const items = await this.prisma.song.findMany({
      where: {
        deletedAt: null,
        ...(query.query ? { normalizedTitle: { contains: normalizeName(query.query) } } : {}),
        ...(query.artistId ? { primaryArtistId: query.artistId } : {}),
        ...(query.albumId ? { albumId: query.albumId } : {}),
        ...(query.tagId ? { songTags: { some: { tagId: query.tagId } } } : {}),
        ...(query.favorite !== undefined || query.minRating !== undefined
          ? {
              userData: {
                some: {
                  userId: user.userId,
                  ...(query.favorite !== undefined ? { favorite: query.favorite } : {}),
                  ...(query.minRating !== undefined ? { rating: { gte: query.minRating } } : {}),
                },
              },
            }
          : {}),
      },
      orderBy: { id: "asc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: songInclude(user.userId),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      items: page,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1].id) : undefined,
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const song = await this.prisma.song.findFirst({
      where: { id, deletedAt: null },
      include: songInclude(user.userId),
    });
    if (!song) {
      throw new NotFoundException(`Song ${id} not found.`);
    }
    return song;
  }

  async update(id: string, input: UpdateSongInput, user: AuthenticatedUser) {
    const existing = await this.prisma.song.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Song ${id} not found.`);
    }

    const song = await this.prisma.song.update({
      where: { id },
      data: {
        ...input,
        ...(input.title ? { normalizedTitle: normalizeName(input.title) } : {}),
        ...(input.releaseYear !== undefined || input.releaseMonth !== undefined
          ? {
              releasePrecision: releasePrecisionOf(
                input.releaseYear ?? existing.releaseYear ?? undefined,
                input.releaseMonth ?? existing.releaseMonth ?? undefined,
                input.releaseDay ?? existing.releaseDay ?? undefined,
              ),
            }
          : {}),
      },
      include: songInclude(user.userId),
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "song",
      entityId: song.id,
      beforeJson: existing,
      afterJson: song,
    });

    return { song, auditEventId };
  }

  async updateUserData(songId: string, input: UpdateSongUserDataInput, user: AuthenticatedUser) {
    await this.findOne(songId, user); // 404s if the song doesn't exist

    const existing = await this.prisma.songUserData.findUnique({
      where: { userId_songId: { userId: user.userId, songId } },
    });

    const data = {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.energyLevel !== undefined ? { energyLevel: input.energyLevel } : {}),
      ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.userNote !== undefined ? { userNote: input.userNote } : {}),
      ...(input.discoveredAt !== undefined
        ? { discoveredAt: input.discoveredAt ? new Date(input.discoveredAt) : null }
        : {}),
      ...(input.discoverySource !== undefined ? { discoverySource: input.discoverySource } : {}),
    };

    const userData = await this.prisma.songUserData.upsert({
      where: { userId_songId: { userId: user.userId, songId } },
      create: { userId: user.userId, songId, ...data },
      update: data,
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: existing ? "update" : "create",
      entityType: "song_user_data",
      entityId: songId,
      beforeJson: existing,
      afterJson: userData,
    });

    return { userData, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.song.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Song ${id} not found.`);
    }

    const song = await this.prisma.song.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "song",
      entityId: song.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }

  async attachTag(songId: string, tagId: string, user: AuthenticatedUser) {
    await this.findOne(songId, user);

    const existing = await this.prisma.songTag.findUnique({
      where: { songId_tagId: { songId, tagId } },
    });
    if (existing) {
      return { songTag: existing, auditEventId: null };
    }

    const songTag = await this.prisma.songTag.create({
      data: { songId, tagId, source: "USER", createdBy: user.userId, approvedAt: new Date() },
      include: { tag: true },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "song_tag",
      entityId: `${songId}:${tagId}`,
      afterJson: songTag,
    });

    return { songTag, auditEventId };
  }

  async detachTag(songId: string, tagId: string, user: AuthenticatedUser) {
    const existing = await this.prisma.songTag.findUnique({
      where: { songId_tagId: { songId, tagId } },
    });
    if (!existing) {
      throw new NotFoundException(`Song ${songId} does not have tag ${tagId}.`);
    }

    await this.prisma.songTag.delete({ where: { songId_tagId: { songId, tagId } } });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "song_tag",
      entityId: `${songId}:${tagId}`,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
