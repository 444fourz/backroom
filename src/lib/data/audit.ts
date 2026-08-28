import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * The specific "every view of a medical or safeguarding record" promise —
 * not a general audit browser. Deliberately an allowlist of actions, not
 * "everything writeAuditLog has ever recorded": showing an
 * invoice.waived or role-change entry here would leak activity from a
 * domain (finance, membership) this page has no business surfacing,
 * even without showing the underlying figures.
 */
const SAFEGUARDING_ACTIONS = [
  "medical.viewed",
  "credential.document.viewed",
  "registration.medical.updated",
  "registration.contact.updated",
  "registration.consent.updated",
] as const;

/**
 * AuditLog has no clubId of its own (it's actor-centric, not tenant-
 * scoped) — approximated here by "the actor currently belongs to this
 * club." That's exact for how the app is used today (nobody holds
 * memberships at two different real clubs); if that ever changes, AuditLog
 * would need its own clubId column instead of this join.
 */
export async function listSafeguardingAccessLog(active: Membership, limit = 100) {
  if (active.role !== "SECRETARY" && active.role !== "WELFARE_OFFICER") return [];

  const members = await prisma.membership.findMany({
    where: { clubId: active.clubId },
    select: { userId: true },
    distinct: ["userId"],
  });

  const logs = await prisma.auditLog.findMany({
    where: {
      actorUserId: { in: members.map((member) => member.userId) },
      action: { in: [...SAFEGUARDING_ACTIONS] },
    },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const playerIds = logs
    .filter((log) => log.entityType === "PlayerMedicalInfo" || log.entityType === "Player")
    .map((log) => log.entityId);
  const players = playerIds.length
    ? await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const playerNameById = new Map(players.map((player) => [player.id, `${player.firstName} ${player.lastName}`]));

  return logs.map((log) => ({
    ...log,
    subjectName: playerNameById.get(log.entityId) ?? null,
  }));
}
