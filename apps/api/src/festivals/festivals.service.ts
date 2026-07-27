import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateFestivalInput,
  CreateFestivalPerformanceInput,
  UpdateFestivalInput,
  UpdateFestivalPerformanceInput,
} from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { decodeCursor, encodeCursor } from "../common/pagination/cursor";

const briefInclude = {
  performances: {
    include: { artist: true },
    orderBy: [{ priority: "asc" as const }, { startsAt: "asc" as const }],
  },
};

@Injectable()
export class FestivalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateFestivalInput, user: AuthenticatedUser) {
    const festival = await this.prisma.festival.create({
      data: {
        name: input.name,
        city: input.city,
        countryCode: input.countryCode,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        websiteUrl: input.websiteUrl,
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "festival",
      entityId: festival.id,
      afterJson: festival,
    });

    return { festival, auditEventId };
  }

  async findAll(params: { limit?: number; cursor?: string }) {
    const limit = params.limit ?? 25;
    const cursorId = decodeCursor(params.cursor);

    const items = await this.prisma.festival.findMany({
      where: { deletedAt: null },
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

  /** The "festival brief": lineup, priorities, collisions, and any personal notes/ratings so far. */
  async findOne(id: string) {
    const festival = await this.prisma.festival.findFirst({
      where: { id, deletedAt: null },
      include: briefInclude,
    });
    if (!festival) {
      throw new NotFoundException(`Festival ${id} not found.`);
    }

    const performances = festival.performances.map((performance) => ({
      ...performance,
      collidesWith: festival.performances
        .filter(
          (other) =>
            other.id !== performance.id &&
            performance.startsAt &&
            performance.endsAt &&
            other.startsAt &&
            other.endsAt &&
            performance.startsAt < other.endsAt &&
            other.startsAt < performance.endsAt,
        )
        .map((other) => other.id),
    }));

    return { ...festival, performances };
  }

  async update(id: string, input: UpdateFestivalInput, user: AuthenticatedUser) {
    const existing = await this.prisma.festival.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Festival ${id} not found.`);
    }

    const festival = await this.prisma.festival.update({
      where: { id },
      data: {
        ...input,
        ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "festival",
      entityId: festival.id,
      beforeJson: existing,
      afterJson: festival,
    });

    return { festival, auditEventId };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.festival.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException(`Festival ${id} not found.`);
    }

    const festival = await this.prisma.festival.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "festival",
      entityId: festival.id,
      beforeJson: existing,
    });

    return { auditEventId };
  }

  async addPerformance(
    festivalId: string,
    input: CreateFestivalPerformanceInput,
    user: AuthenticatedUser,
  ) {
    await this.findOne(festivalId);

    const performance = await this.prisma.festivalPerformance.create({
      data: {
        festivalId,
        artistId: input.artistId,
        stage: input.stage,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        priority: input.priority,
        attended: input.attended,
        rating: input.rating,
        note: input.note,
      },
      include: { artist: true },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "festival_performance",
      entityId: performance.id,
      afterJson: performance,
    });

    return { performance, auditEventId };
  }

  async updatePerformance(
    festivalId: string,
    performanceId: string,
    input: UpdateFestivalPerformanceInput,
    user: AuthenticatedUser,
  ) {
    const existing = await this.prisma.festivalPerformance.findFirst({
      where: { id: performanceId, festivalId },
    });
    if (!existing) {
      throw new NotFoundException(`Performance ${performanceId} not found.`);
    }

    const performance = await this.prisma.festivalPerformance.update({
      where: { id: performanceId },
      data: {
        ...input,
        ...(input.startsAt ? { startsAt: new Date(input.startsAt) } : {}),
        ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}),
      },
      include: { artist: true },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "update",
      entityType: "festival_performance",
      entityId: performance.id,
      beforeJson: existing,
      afterJson: performance,
    });

    return { performance, auditEventId };
  }

  async removePerformance(festivalId: string, performanceId: string, user: AuthenticatedUser) {
    const existing = await this.prisma.festivalPerformance.findFirst({
      where: { id: performanceId, festivalId },
    });
    if (!existing) {
      throw new NotFoundException(`Performance ${performanceId} not found.`);
    }

    await this.prisma.festivalPerformance.delete({ where: { id: performanceId } });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "festival_performance",
      entityId: performanceId,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
