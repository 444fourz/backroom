import { z } from "zod";

export const waiveInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(3, "Give a brief reason").max(200),
});
