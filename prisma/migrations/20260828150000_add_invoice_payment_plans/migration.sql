-- Payment plans: splitting one overdue invoice into N installment
-- invoices. No new model — an installment is just another Invoice row
-- pointing back at the one it replaced.
ALTER TYPE "InvoiceStatus" ADD VALUE 'SUPERSEDED';

ALTER TABLE "Invoice" ADD COLUMN "parentInvoiceId" TEXT;

CREATE INDEX "Invoice_parentInvoiceId_idx" ON "Invoice"("parentInvoiceId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_parentInvoiceId_fkey"
    FOREIGN KEY ("parentInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
