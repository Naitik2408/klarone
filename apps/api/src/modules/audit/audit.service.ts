import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export interface CreateAuditLogInput {
  userAccountId?: bigint;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

function toJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userAccountId: input.userAccountId,
        action: input.action,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        description: input.description,
        oldData: toJsonValue(input.oldData) as never,
        newData: toJsonValue(input.newData) as never,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
      },
    });
  }
}