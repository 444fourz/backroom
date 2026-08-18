import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

// The treasurer sees "names, and the family responsible for payment" —
// enough to chase arrears, and no more. No medical, consent or credential
// data is ever joined into a finance query.
const INVOICE_WITH_PLAYER = {
  player: { select: { id: true, firstName: true, lastName: true, teamId: true } },
} as const;

/**
 * Club-wide finance is TREASURER-only. The safeguarding page promises the
 * welfare officer sees "no financial detail of any kind", and the secretary
 * likewise sees no financial detail — so neither role reaches this data,
 * even though both otherwise administer the club.
 */
export async function listInvoicesForMembership(active: Membership) {
  switch (active.role) {
    case "TREASURER":
      return prisma.invoice.findMany({
        where: { clubId: active.clubId },
        include: INVOICE_WITH_PLAYER,
        orderBy: { dueDate: "asc" },
      });
    case "GUARDIAN":
      return prisma.invoice.findMany({
        where: { player: { guardians: { some: { guardianUserId: active.userId } } } },
        include: INVOICE_WITH_PLAYER,
        orderBy: { dueDate: "asc" },
      });
    default:
      return [];
  }
}

export async function listArrearsForMembership(active: Membership) {
  if (active.role !== "TREASURER") return [];

  return prisma.invoice.findMany({
    where: {
      clubId: active.clubId,
      status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
    },
    include: INVOICE_WITH_PLAYER,
    orderBy: { dueDate: "asc" },
  });
}

export async function getInvoiceForMembership(active: Membership, invoiceId: string) {
  const scopeWhere =
    active.role === "TREASURER"
      ? { id: invoiceId, clubId: active.clubId }
      : active.role === "GUARDIAN"
        ? { id: invoiceId, player: { guardians: { some: { guardianUserId: active.userId } } } }
        : { id: "__none__" };

  return prisma.invoice.findFirst({
    where: scopeWhere,
    include: { ...INVOICE_WITH_PLAYER, payments: true },
  });
}
