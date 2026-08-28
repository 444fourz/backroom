import { z } from "zod";

export const waiveInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(3, "Give a brief reason").max(200),
});

export const createPaymentPlanSchema = z.object({
  invoiceId: z.string().min(1),
  installments: z.coerce.number().int().min(2, "At least 2 installments").max(6, "At most 6 installments"),
});
