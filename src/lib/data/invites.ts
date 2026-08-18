import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/** Pending (unaccepted, unexpired) invites for the caller's club. */
export async function listPendingInvites(active: Membership) {
  if (active.role !== "SECRETARY") return [];

  return prisma.invite.findMany({
    where: {
      clubId: active.clubId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
