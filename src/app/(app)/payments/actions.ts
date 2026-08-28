"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { waiveInvoiceSchema } from "@/lib/validation/payment.schema";
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
