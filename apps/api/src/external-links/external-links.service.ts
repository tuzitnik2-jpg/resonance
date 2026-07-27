import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateExternalLinkInput } from "@resonance/domain";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";

@Injectable()
export class ExternalLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateExternalLinkInput, user: AuthenticatedUser) {
    const link = await this.prisma.externalLink.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        provider: input.provider,
        url: input.url,
        providerId: input.providerId,
      },
    });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "create",
      entityType: "external_link",
      entityId: link.id,
      afterJson: link,
    });

    return { link, auditEventId };
  }

  async findAll(entityType?: string, entityId?: string) {
    const items = await this.prisma.externalLink.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return { items };
  }

  /**
   * Checks whether a link still resolves and stamps verifiedAt if so (source doc §5.2/§17.6:
   * "Ověření externích odkazů"). Never treats a failed check as proof the linked entity doesn't
   * exist -- e.g. Spotify regional availability varies, per §12.3.
   */
  async verify(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.externalLink.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`External link ${id} not found.`);
    }

    let reachable: boolean;
    try {
      const res = await fetch(existing.url, { method: "HEAD", redirect: "follow" });
      reachable = res.ok || (res.status >= 300 && res.status < 400);
    } catch {
      reachable = false;
    }

    const link = await this.prisma.externalLink.update({
      where: { id },
      data: reachable ? { verifiedAt: new Date() } : {},
    });

    if (reachable) {
      await this.audit.record({
        userId: user.userId,
        actorType: "USER",
        actorId: user.userId,
        action: "verify",
        entityType: "external_link",
        entityId: link.id,
        beforeJson: existing,
        afterJson: link,
      });
    }

    return { link, reachable };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.externalLink.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`External link ${id} not found.`);
    }

    await this.prisma.externalLink.delete({ where: { id } });

    const auditEventId = await this.audit.record({
      userId: user.userId,
      actorType: "USER",
      actorId: user.userId,
      action: "delete",
      entityType: "external_link",
      entityId: id,
      beforeJson: existing,
    });

    return { auditEventId };
  }
}
