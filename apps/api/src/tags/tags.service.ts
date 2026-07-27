import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { normalizeName, tagCategorySchema } from "@resonance/domain";
import type { CreateTagInput, UpdateTagInput } from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(category?: string) {
    const parsedCategory = category ? tagCategorySchema.safeParse(category) : undefined;
    if (category && parsedCategory && !parsedCategory.success) {
      throw new BadRequestException(`Unknown tag category "${category}".`);
    }

    const tags = await this.prisma.tag.findMany({
      where: {
        deletedAt: null,
        ...(parsedCategory?.success ? { category: parsedCategory.data } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return { items: tags };
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, deletedAt: null } });
    if (!tag) {
      throw new NotFoundException(`Tag ${id} not found.`);
    }
    return tag;
  }

  async create(input: CreateTagInput) {
    const normalizedName = normalizeName(input.name);
    const existing = await this.prisma.tag.findFirst({
      where: { normalizedName, category: input.category },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.tag.create({
      data: {
        name: input.name,
        normalizedName,
        category: input.category,
        description: input.description,
      },
    });
  }

  async update(id: string, input: UpdateTagInput, user: AuthenticatedUser) {
    const existing = await this.findOne(id);

    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { normalizedName: normalizeName(input.name) } : {}),
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "tag",
      entityId: tag.id,
      beforeJson: existing,
      afterJson: tag,
    });

    return { tag, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.findOne(id);

    const tag = await this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "tag",
      entityId: tag.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
