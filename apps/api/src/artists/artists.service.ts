import { Injectable, NotFoundException } from "@nestjs/common";
import { normalizeName } from "@resonance/domain";
import type { CreateArtistInput, UpdateArtistInput } from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { decodeCursor, encodeCursor } from "../common/pagination/cursor";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

export interface DuplicateWarning {
  existingId: string;
  message: string;
}

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateArtistInput, user: AuthenticatedUser) {
    const normalizedName = normalizeName(input.canonicalName);

    if (!input.force) {
      const existing = await this.prisma.artist.findFirst({
        where: { normalizedName, deletedAt: null },
      });
      if (existing) {
        return {
          artist: existing,
          created: false,
          duplicateWarning: {
            existingId: existing.id,
            message: `An artist named "${existing.canonicalName}" already exists. Pass force=true to create a separate record anyway.`,
          } satisfies DuplicateWarning,
          auditEventId: null,
        };
      }
    }

    const artist = await this.prisma.artist.create({
      data: {
        canonicalName: input.canonicalName,
        normalizedName,
        countryCode: input.countryCode,
        artistType: input.artistType,
        originCity: input.originCity,
        beginDate: input.beginDate,
        endDate: input.endDate,
        websiteUrl: input.websiteUrl,
        description: input.description,
        musicbrainzId: input.musicbrainzId,
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "artist",
      entityId: artist.id,
      afterJson: artist,
    });

    return { artist, created: true, duplicateWarning: null, auditEventId };
  }

  async findAll(params: { query?: string; limit?: number; cursor?: string }) {
    const limit = params.limit ?? 25;
    const cursorId = decodeCursor(params.cursor);

    const items = await this.prisma.artist.findMany({
      where: {
        deletedAt: null,
        ...(params.query ? { normalizedName: { contains: normalizeName(params.query) } } : {}),
      },
      orderBy: { id: "asc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      items: page,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1].id) : undefined,
    };
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findFirst({
      where: { id, deletedAt: null },
      include: { artistTags: { include: { tag: true } } },
    });
    if (!artist) {
      throw new NotFoundException(`Artist ${id} not found.`);
    }
    return artist;
  }

  async attachTag(artistId: string, tagId: string, user: AuthenticatedUser) {
    await this.findOne(artistId);

    const existing = await this.prisma.artistTag.findUnique({
      where: { artistId_tagId: { artistId, tagId } },
    });
    if (existing) {
      return { artistTag: existing, auditEventId: null };
    }

    const artistTag = await this.prisma.artistTag.create({
      data: { artistId, tagId, source: "USER", createdBy: user.userId },
      include: { tag: true },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "artist_tag",
      entityId: `${artistId}:${tagId}`,
      afterJson: artistTag,
    });

    return { artistTag, auditEventId };
  }

  async detachTag(artistId: string, tagId: string, user: AuthenticatedUser) {
    const existing = await this.prisma.artistTag.findUnique({
      where: { artistId_tagId: { artistId, tagId } },
    });
    if (!existing) {
      throw new NotFoundException(`Artist ${artistId} does not have tag ${tagId}.`);
    }

    await this.prisma.artistTag.delete({ where: { artistId_tagId: { artistId, tagId } } });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "artist_tag",
      entityId: `${artistId}:${tagId}`,
      beforeJson: existing,
    });

    return { auditEventId };
  }

  async update(id: string, input: UpdateArtistInput, user: AuthenticatedUser) {
    const existing = await this.findOne(id);

    const artist = await this.prisma.artist.update({
      where: { id },
      data: {
        ...input,
        ...(input.canonicalName ? { normalizedName: normalizeName(input.canonicalName) } : {}),
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "artist",
      entityId: artist.id,
      beforeJson: existing,
      afterJson: artist,
    });

    return { artist, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.findOne(id);

    const artist = await this.prisma.artist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "artist",
      entityId: artist.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
