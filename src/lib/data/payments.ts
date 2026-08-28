import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

// The treasurer sees "names, and the family responsible for payment" —
// enough to chase arrears, and no more. No medical, consent or credential
// data is ever joined into a finance query — only the primary guardian's
// name/email, which is what "the family responsible for payment" means in
// practice for chasing an overdue invoice.
const INVOICE_WITH_PLAYER = {
  player: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      teamId: true,
      guardians: {
        select: {
          isPrimaryContact: true,
          guardian: { select: { name: true, email: true } },
        },
        orderBy: { isPrimaryContact: "desc" },
        take: 1,
      },
    },
  },
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

/**
 * The welfare officer's arrears signal — yes/no per player, never a figure,
 * and only when the club has explicitly turned it on (Club.showArrearsToWelfare,
 * off by default). Returns null (not an empty set) when the caller isn't a
 * welfare officer or the club hasn't enabled it, so callers can tell "no
 * arrears" apart from "not allowed to know."
 */
export async function getArrearsSignalForWelfare(active: Membership) {
  if (active.role !== "WELFARE_OFFICER") return null;

  const club = await prisma.club.findUnique({
    where: { id: active.clubId },
    select: { showArrearsToWelfare: true },
  });
  if (!club?.showArrearsToWelfare) return null;

  const invoices = await prisma.invoice.findMany({
    where: { clubId: active.clubId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    select: { playerId: true },
  });

  return new Set(invoices.map((invoice) => invoice.playerId));
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
