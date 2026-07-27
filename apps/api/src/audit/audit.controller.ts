import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("entityType") entityType?: string, @Query("entityId") entityId?: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items: events };
  }
}
