import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AddPlaylistItemInput,
  CreatePlaylistInput,
  UpdatePlaylistInput,
} from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

const itemsInclude = {
  items: {
    include: { song: { include: { primaryArtist: true } } },
    orderBy: { position: "asc" } as const,
  },
};

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreatePlaylistInput, user: AuthenticatedUser) {
    const playlist = await this.prisma.playlist.create({
      data: {
        userId: user.userId,
        name: input.name,
        type: input.type,
        description: input.description,
        externalUrl: input.externalUrl,
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "playlist",
      entityId: playlist.id,
      afterJson: playlist,
    });

    return { playlist, auditEventId };
  }

  async findAll(user: AuthenticatedUser) {
    const items = await this.prisma.playlist.findMany({
      where: { userId: user.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return { items };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id, userId: user.userId, deletedAt: null },
      include: itemsInclude,
    });
    if (!playlist) {
      throw new NotFoundException(`Playlist ${id} not found.`);
    }
    return playlist;
  }

  async update(id: string, input: UpdatePlaylistInput, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);

    const playlist = await this.prisma.playlist.update({
      where: { id },
      data: input,
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "playlist",
      entityId: playlist.id,
      beforeJson: existing,
      afterJson: playlist,
    });

    return { playlist, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);

    const playlist = await this.prisma.playlist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "playlist",
      entityId: playlist.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }

  async addItem(playlistId: string, input: AddPlaylistItemInput, user: AuthenticatedUser) {
    const playlist = await this.findOne(playlistId, user);

    const position = input.position ?? playlist.items.length;

    const item = await this.prisma.playlistItem.upsert({
      where: { playlistId_songId: { playlistId, songId: input.songId } },
      update: { position, reason: input.reason },
      create: { playlistId, songId: input.songId, position, reason: input.reason },
      include: { song: { include: { primaryArtist: true } } },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "playlist_item",
      entityId: `${playlistId}:${input.songId}`,
      afterJson: item,
    });

    return { item, auditEventId };
  }

  async removeItem(playlistId: string, songId: string, user: AuthenticatedUser) {
    await this.findOne(playlistId, user);

    const existing = await this.prisma.playlistItem.findUnique({
      where: { playlistId_songId: { playlistId, songId } },
    });
    if (!existing) {
      throw new NotFoundException(`Playlist ${playlistId} does not contain song ${songId}.`);
    }

    await this.prisma.playlistItem.delete({ where: { playlistId_songId: { playlistId, songId } } });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "playlist_item",
      entityId: `${playlistId}:${songId}`,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
