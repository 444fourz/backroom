import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const INVOICE_WITH_PLAYER = {
  player: { select: { id: true, firstName: true, lastName: true, teamId: true } },
} as const;

export async function listInvoicesForMembership(active: Membership) {
  switch (active.role) {
    case "TREASURER":
    case "ADMIN":
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
  if (active.role !== "TREASURER" && active.role !== "ADMIN") return [];

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
    active.role === "TREASURER" || active.role === "ADMIN"
      ? { id: invoiceId, clubId: active.clubId }
      : active.role === "GUARDIAN"
        ? { id: invoiceId, player: { guardians: { some: { guardianUserId: active.userId } } } }
        : { id: "__none__" };

  return prisma.invoice.findFirst({
    where: scopeWhere,
    include: { ...INVOICE_WITH_PLAYER, payments: true },
  });
}
