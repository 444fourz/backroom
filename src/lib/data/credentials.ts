import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * ADMIN sees every credential at the club. COACH sees only their own — this
 * is `credential:view:own` rather than `credential:view:club`, and it's
 * enforced here by scoping to `userId: active.userId` rather than by
 * filtering in the page. TREASURER and GUARDIAN get an empty list; the
 * /safeguarding route itself is also hard-blocked for them at the guard.
 */
export async function listCredentialsForMembership(active: Membership) {
  const userWith = { select: { id: true, name: true } } as const;

  if (active.role === "ADMIN") {
    return prisma.credential.findMany({
      where: { clubId: active.clubId },
      include: { user: userWith },
      orderBy: { expiryDate: "asc" },
    });
  }

  if (active.role === "COACH") {
    return prisma.credential.findMany({
      where: { clubId: active.clubId, userId: active.userId },
      include: { user: userWith },
      orderBy: { expiryDate: "asc" },
    });
  }

  return [];
}

export async function getCredentialForMembership(active: Membership, credentialId: string) {
  const scopeWhere =
    active.role === "ADMIN"
      ? { id: credentialId, clubId: active.clubId }
      : active.role === "COACH"
        ? { id: credentialId, clubId: active.clubId, userId: active.userId }
        : { id: "__none__" };

  return prisma.credential.findFirst({
    where: scopeWhere,
    include: { user: { select: { id: true, name: true } }, document: true },
  });
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isExpiringSoon(expiryDate: Date) {
  return expiryDate.getTime() - Date.now() < THIRTY_DAYS_MS;
}

export function isExpired(expiryDate: Date) {
  return expiryDate.getTime() < Date.now();
}
