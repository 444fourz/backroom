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

export function outstandingPence(invoice: {
  amountPence: number;
  discountPence: number | null;
  payments: { amountPence: number }[];
}) {
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPence, 0);
  return Math.max(0, invoice.amountPence - (invoice.discountPence ?? 0) - paid);
}

function daysOverdue(dueDate: Date) {
  return Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
}

type ArrearsBucketKey = "0-30" | "30-60" | "60+";
const ARREARS_BUCKETS: ArrearsBucketKey[] = ["0-30", "30-60", "60+"];

function bucketFor(days: number): ArrearsBucketKey {
  if (days > 60) return "60+";
  if (days > 30) return "30-60";
  return "0-30";
}

/**
 * Arrears grouped by how overdue they are, for the treasurer only — the
 * same figures as listArrearsForMembership, aggregated. "Family" is
 * approximated by the player's primary guardian, since there's no separate
 * Family model; outstanding balance accounts for partial payments and any
 * waived discount, not just the invoice's face amount.
 */
export async function getArrearsSummary(active: Membership) {
  if (active.role !== "TREASURER") return null;

  const invoices = await prisma.invoice.findMany({
    where: { clubId: active.clubId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    include: {
      payments: { select: { amountPence: true } },
      player: {
        select: { guardians: { select: { guardianUserId: true }, take: 1 } },
      },
    },
  });

  const totals = new Map<ArrearsBucketKey, { familyIds: Set<string>; pence: number }>(
    ARREARS_BUCKETS.map((key) => [key, { familyIds: new Set<string>(), pence: 0 }]),
  );
  const allFamilyIds = new Set<string>();
  let totalPence = 0;

  for (const invoice of invoices) {
    const outstanding = outstandingPence(invoice);
    if (outstanding <= 0) continue;

    const familyId = invoice.player.guardians[0]?.guardianUserId ?? `player:${invoice.playerId}`;
    const bucket = totals.get(bucketFor(daysOverdue(invoice.dueDate)))!;
    bucket.familyIds.add(familyId);
    bucket.pence += outstanding;
    allFamilyIds.add(familyId);
    totalPence += outstanding;
  }

  return {
    totalPence,
    familyCount: allFamilyIds.size,
    buckets: ARREARS_BUCKETS.map((key) => {
      const bucket = totals.get(key)!;
      return { key, familyCount: bucket.familyIds.size, pence: bucket.pence };
    }),
  };
}

/**
 * The handful of invoices most worth a treasurer's attention right now —
 * furthest overdue first. Not the full arrears list (that's
 * listArrearsForMembership already); this is the short "needs a decision"
 * shortlist.
 */
export async function listArrearsNeedingDecision(active: Membership, limit = 5) {
  if (active.role !== "TREASURER") return [];

  const invoices = await prisma.invoice.findMany({
    where: { clubId: active.clubId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    include: { ...INVOICE_WITH_PLAYER, payments: { select: { amountPence: true } } },
    orderBy: { dueDate: "asc" },
  });

  return invoices
    .map((invoice) => ({
      ...invoice,
      outstandingPence: outstandingPence(invoice),
      daysOverdue: daysOverdue(invoice.dueDate),
    }))
    .filter((invoice) => invoice.outstandingPence > 0 && invoice.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit);
}

/**
 * This calendar month's collections vs. what was due — TREASURER only, same
 * "no financial detail to anyone else" boundary as the rest of this file.
 */
export async function getMonthlyCollectionSummary(active: Membership) {
  if (active.role !== "TREASURER") return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [payments, invoicesDue] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: monthStart, lt: monthEnd }, invoice: { clubId: active.clubId } },
      select: { amountPence: true },
    }),
    prisma.invoice.findMany({
      where: { clubId: active.clubId, dueDate: { gte: monthStart, lt: monthEnd } },
      select: { amountPence: true, discountPence: true },
    }),
  ]);

  const collectedPence = payments.reduce((sum, payment) => sum + payment.amountPence, 0);
  const expectedPence = invoicesDue.reduce(
    (sum, invoice) => sum + invoice.amountPence - (invoice.discountPence ?? 0),
    0,
  );

  return { collectedPence, expectedPence };
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
