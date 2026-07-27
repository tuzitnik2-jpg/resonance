import { Injectable, NotFoundException } from "@nestjs/common";
import { normalizeName } from "@resonance/domain";
import type { CreateAlbumInput, UpdateAlbumInput } from "@resonance/domain";
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

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateAlbumInput, user: AuthenticatedUser) {
    const normalizedTitle = normalizeName(input.title);

    if (!input.force) {
      const existing = await this.prisma.album.findFirst({
        where: { artistId: input.artistId, normalizedTitle, deletedAt: null },
      });
      if (existing) {
        return {
          album: existing,
          created: false,
          duplicateWarning: {
            existingId: existing.id,
            message: `An album titled "${existing.title}" by this artist already exists. Pass force=true to create a separate record anyway.`,
          } satisfies DuplicateWarning,
          auditEventId: null,
        };
      }
    }

    const album = await this.prisma.album.create({
      data: {
        artistId: input.artistId,
        title: input.title,
        normalizedTitle,
        releaseType: input.releaseType,
        releaseYear: input.releaseYear,
        releaseMonth: input.releaseMonth,
        releaseDay: input.releaseDay,
        releasePrecision: releasePrecisionOf(
          input.releaseYear,
          input.releaseMonth,
          input.releaseDay,
        ),
        coverUrl: input.coverUrl,
        label: input.label,
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "album",
      entityId: album.id,
      afterJson: album,
    });

    return { album, created: true, duplicateWarning: null, auditEventId };
  }

  async findAll(params: { artistId?: string; limit?: number; cursor?: string }) {
    const limit = params.limit ?? 25;
    const cursorId = decodeCursor(params.cursor);

    const items = await this.prisma.album.findMany({
      where: {
        deletedAt: null,
        ...(params.artistId ? { artistId: params.artistId } : {}),
      },
      orderBy: { id: "asc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: { artist: true },
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      items: page,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1].id) : undefined,
    };
  }

  async findOne(id: string) {
    const album = await this.prisma.album.findFirst({
      where: { id, deletedAt: null },
      include: { artist: true, albumTags: { include: { tag: true } } },
    });
    if (!album) {
      throw new NotFoundException(`Album ${id} not found.`);
    }
    return album;
  }

  async attachTag(albumId: string, tagId: string, user: AuthenticatedUser) {
    await this.findOne(albumId);

    const existing = await this.prisma.albumTag.findUnique({
      where: { albumId_tagId: { albumId, tagId } },
    });
    if (existing) {
      return { albumTag: existing, auditEventId: null };
    }

    const albumTag = await this.prisma.albumTag.create({
      data: { albumId, tagId, source: "USER", createdBy: user.userId },
      include: { tag: true },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "album_tag",
      entityId: `${albumId}:${tagId}`,
      afterJson: albumTag,
    });

    return { albumTag, auditEventId };
  }

  async detachTag(albumId: string, tagId: string, user: AuthenticatedUser) {
    const existing = await this.prisma.albumTag.findUnique({
      where: { albumId_tagId: { albumId, tagId } },
    });
    if (!existing) {
      throw new NotFoundException(`Album ${albumId} does not have tag ${tagId}.`);
    }

    await this.prisma.albumTag.delete({ where: { albumId_tagId: { albumId, tagId } } });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "album_tag",
      entityId: `${albumId}:${tagId}`,
      beforeJson: existing,
    });

    return { auditEventId };
  }

  async update(id: string, input: UpdateAlbumInput, user: AuthenticatedUser) {
    const existing = await this.prisma.album.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Album ${id} not found.`);
    }

    const album = await this.prisma.album.update({
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
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "album",
      entityId: album.id,
      beforeJson: existing,
      afterJson: album,
    });

    return { album, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.album.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Album ${id} not found.`);
    }

    const album = await this.prisma.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "album",
      entityId: album.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
