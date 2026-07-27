import { Injectable } from "@nestjs/common";
import type { ActorType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface RecordAuditEventInput {
  userId?: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  /** Any serializable value, e.g. a Prisma model instance — Dates are coerced to ISO strings. */
  beforeJson?: unknown;
  afterJson?: unknown;
  requestId?: string;
}

/** Coerces a value (e.g. a Prisma model with Date fields) into a plain JSON-safe value. */
function toJsonSafe(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Sole write path to audit_events. Only ever calls .create() — the audit log
 * must stay append-only (see ADR-0004).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEventInput): Promise<string> {
    const event = await this.prisma.auditEvent.create({
      data: {
        userId: input.userId,
        actorType: input.actorType,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeJson: toJsonSafe(input.beforeJson),
        afterJson: toJsonSafe(input.afterJson),
        requestId: input.requestId,
      },
    });
    return event.id;
  }
}
