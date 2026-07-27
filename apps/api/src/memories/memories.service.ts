import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateMemoryInput, UpdateMemoryInput } from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

@Injectable()
export class MemoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateMemoryInput, user: AuthenticatedUser) {
    const memory = await this.prisma.memory.create({
      data: {
        userId: user.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        body: input.body,
        occurredOn: input.occurredOn ? new Date(input.occurredOn) : undefined,
        location: input.location,
        visibility: input.visibility,
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "memory",
      entityId: memory.id,
      afterJson: memory,
    });

    return { memory, auditEventId };
  }

  async findAll(user: AuthenticatedUser, params: { entityType?: string; entityId?: string }) {
    const memories = await this.prisma.memory.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
        ...(params.entityType ? { entityType: params.entityType } : {}),
        ...(params.entityId ? { entityId: params.entityId } : {}),
      },
      orderBy: { occurredOn: "desc" },
    });
    return { items: memories };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const memory = await this.prisma.memory.findFirst({
      where: { id, userId: user.userId, deletedAt: null },
    });
    if (!memory) {
      throw new NotFoundException(`Memory ${id} not found.`);
    }
    return memory;
  }

  async update(id: string, input: UpdateMemoryInput, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);

    const memory = await this.prisma.memory.update({
      where: { id },
      data: {
        ...input,
        ...(input.occurredOn ? { occurredOn: new Date(input.occurredOn) } : {}),
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "memory",
      entityId: memory.id,
      beforeJson: existing,
      afterJson: memory,
    });

    return { memory, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);

    const memory = await this.prisma.memory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "memory",
      entityId: memory.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
