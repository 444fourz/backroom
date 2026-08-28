"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { waiveInvoiceSchema, createPaymentPlanSchema } from "@/lib/validation/payment.schema";
import { outstandingPence } from "@/lib/data/payments";
import { writeAuditLog } from "@/lib/audit/log";

export async function waiveInvoiceAction(formData: FormData) {
  const { user, active } = await requireCapability("payment:manage");

  const parsed = waiveInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  // Re-derive scope server-side — never trust the posted invoiceId alone.
  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, clubId: active.clubId },
  });
  if (!invoice) return;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "WAIVED", waivedReason: parsed.data.reason },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "invoice.waived",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { reason: parsed.data.reason },
  });

  revalidatePath("/payments/arrears");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Splits one overdue invoice into N installment invoices spaced 30 days
 * apart, each a normal Invoice row (so waiving/reminding/paying an
 * installment individually just works, reusing everything arrears already
 * does) — the original is marked SUPERSEDED so its balance stops being
 * double-counted in arrears once its installments exist.
 */
export async function createPaymentPlanAction(formData: FormData) {
  const { user, active } = await requireCapability("payment:manage");

  const parsed = createPaymentPlanSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    installments: formData.get("installments"),
  });
  if (!parsed.success) return;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: parsed.data.invoiceId,
      clubId: active.clubId,
      status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
    },
    include: { payments: { select: { amountPence: true } } },
  });
  if (!invoice) return;

  const outstanding = outstandingPence(invoice);
  if (outstanding <= 0) return;

  const count = parsed.data.installments;
  const base = Math.floor(outstanding / count);
  const remainder = outstanding - base * count;
  const now = Date.now();

  const installments = Array.from({ length: count }, (_, index) => ({
    clubId: active.clubId,
    playerId: invoice.playerId,
    seasonId: invoice.seasonId,
    type: invoice.type,
    description: `${invoice.description} — installment ${index + 1} of ${count}`,
    amountPence: index === count - 1 ? base + remainder : base,
    dueDate: new Date(now + (index + 1) * 30 * DAY_MS),
    status: "PENDING" as const,
    parentInvoiceId: invoice.id,
  }));

  await prisma.$transaction([
    prisma.invoice.createMany({ data: installments }),
    prisma.invoice.update({ where: { id: invoice.id }, data: { status: "SUPERSEDED" } }),
  ]);

  await writeAuditLog({
    actorUserId: user.id,
    action: "invoice.paymentPlan.created",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { installments: count, outstandingPence: outstanding },
  });

  revalidatePath("/payments/arrears");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
