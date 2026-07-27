import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

export type ImageEntity = "song" | "artist" | "album";

const ENTITIES: ImageEntity[] = ["song", "artist", "album"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB after decode — plenty for a downscaled cover.

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private model(entity: ImageEntity) {
    switch (entity) {
      case "song":
        return this.prisma.song;
      case "artist":
        return this.prisma.artist;
      case "album":
        return this.prisma.album;
    }
  }

  static assertEntity(entity: string): asserts entity is ImageEntity {
    if (!ENTITIES.includes(entity as ImageEntity)) {
      throw new BadRequestException(`entityType must be one of ${ENTITIES.join(", ")}`);
    }
  }

  async getImage(
    entity: ImageEntity,
    id: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    // Prisma's generated delegates don't share a common type here, so read via a narrow cast.
    const model = this.model(entity) as {
      findFirst: (
        args: unknown,
      ) => Promise<{ imageData: Buffer | null; imageMimeType: string | null } | null>;
    };
    const row = await model.findFirst({
      where: { id, deletedAt: null },
      select: { imageData: true, imageMimeType: true },
    });
    if (!row?.imageData || !row.imageMimeType) return null;
    return { data: Buffer.from(row.imageData), mimeType: row.imageMimeType };
  }

  async setImage(
    entity: ImageEntity,
    id: string,
    dataBase64: string,
    mimeType: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new BadRequestException(`mimeType must be one of ${ALLOWED_MIME.join(", ")}`);
    }
    const buffer = Buffer.from(dataBase64, "base64");
    if (buffer.length === 0) throw new BadRequestException("image data is empty");
    if (buffer.length > MAX_BYTES) {
      throw new PayloadTooLargeException("image exceeds 4 MB — please use a smaller picture");
    }

    const model = this.model(entity) as {
      updateMany: (args: unknown) => Promise<{ count: number }>;
    };
    const res = await model.updateMany({
      where: { id, deletedAt: null },
      data: { imageData: buffer, imageMimeType: mimeType },
    });
    if (res.count === 0) throw new NotFoundException(`${entity} not found`);

    await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: `${entity}.image.set`,
      entityType: entity,
      entityId: id,
      afterJson: { mimeType, bytes: buffer.length },
    });
  }

  async clearImage(entity: ImageEntity, id: string, user: AuthenticatedUser): Promise<void> {
    const model = this.model(entity) as {
      updateMany: (args: unknown) => Promise<{ count: number }>;
    };
    const res = await model.updateMany({
      where: { id, deletedAt: null },
      data: { imageData: null, imageMimeType: null },
    });
    if (res.count === 0) throw new NotFoundException(`${entity} not found`);

    await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: `${entity}.image.clear`,
      entityType: entity,
      entityId: id,
    });
  }
}
