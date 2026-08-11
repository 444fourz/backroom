import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * Write-only audit trail (see plan: no browsing UI yet, deliberately). Call
 * this from Server Actions that mutate anything safeguarding- or
 * security-relevant — logins, credential/consent changes, attendance,
 * payments — not every read or UI preference toggle.
 */
export async function writeAuditLog(entry: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata,
    },
  });
}
