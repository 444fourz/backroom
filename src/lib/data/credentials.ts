import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * Credential visibility has three levels, mirroring the safeguarding page:
 *
 *  - WELFARE_OFFICER — full safeguarding visibility across every team,
 *    including the attached document.
 *  - SECRETARY — "sees whether a coach's DBS is in date", "does not see the
 *    DBS document itself". Enforced by never selecting documentId/document
 *    for them, not by hiding it in the page.
 *  - COACH — their own record only (`credential:view:own`), scoped by
 *    userId in the query.
 *
 * TREASURER and GUARDIAN get nothing here, and /safeguarding is hard-blocked
 * for them at the route guard as well.
 */

const USER_SELECT = { select: { id: true, name: true } } as const;

/** Everything except the document — what a secretary is allowed to see. */
const STATUS_FIELDS = {
  id: true,
  type: true,
  referenceNumber: true,
  issueDate: true,
  expiryDate: true,
  userId: true,
  clubId: true,
  user: USER_SELECT,
} as const;

export function canSeeCredentialDocument(active: Membership) {
  return active.role === "WELFARE_OFFICER";
}

export async function listCredentialsForMembership(active: Membership) {
  if (active.role === "WELFARE_OFFICER") {
    return prisma.credential.findMany({
      where: { clubId: active.clubId },
      select: { ...STATUS_FIELDS, documentId: true },
      orderBy: { expiryDate: "asc" },
    });
  }

  if (active.role === "SECRETARY") {
    // Status only — the document is deliberately not selected.
    return prisma.credential.findMany({
      where: { clubId: active.clubId },
      select: STATUS_FIELDS,
      orderBy: { expiryDate: "asc" },
    });
  }

  if (active.role === "COACH") {
    return prisma.credential.findMany({
      where: { clubId: active.clubId, userId: active.userId },
      select: STATUS_FIELDS,
      orderBy: { expiryDate: "asc" },
    });
  }

  return [];
}

export async function getCredentialForMembership(active: Membership, credentialId: string) {
  const scopeWhere =
    active.role === "WELFARE_OFFICER" || active.role === "SECRETARY"
      ? { id: credentialId, clubId: active.clubId }
      : active.role === "COACH"
        ? { id: credentialId, clubId: active.clubId, userId: active.userId }
        : { id: "__none__" };

  // Only the welfare officer's query ever joins the document row. Both
  // branches return the same shape (document: … | null) so callers don't
  // have to narrow a union — the difference is what the DB was asked for,
  // which is the part that actually matters.
  if (canSeeCredentialDocument(active)) {
    return prisma.credential.findFirst({
      where: scopeWhere,
      select: { ...STATUS_FIELDS, document: true },
    });
  }

  const credential = await prisma.credential.findFirst({
    where: scopeWhere,
    select: STATUS_FIELDS,
  });
  return credential ? { ...credential, document: null } : null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isExpiringSoon(expiryDate: Date) {
  return expiryDate.getTime() - Date.now() < THIRTY_DAYS_MS;
}

export function isExpired(expiryDate: Date) {
  return expiryDate.getTime() < Date.now();
}
