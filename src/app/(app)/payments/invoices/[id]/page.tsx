import { notFound } from "next/navigation";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { getInvoiceForMembership } from "@/lib/data/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";

function formatPence(pence: number) {
  return (pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { active } = await requireAnyCapability(["payment:view:all", "payment:view:own"]);

  const invoice = await getInvoiceForMembership(active, id);
  if (!invoice) notFound();

  const contact = invoice.player.guardians[0]?.guardian;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{invoice.description}</h1>
        <p className="text-sm text-muted-foreground">
          {invoice.player.firstName} {invoice.player.lastName}
        </p>
      </div>

      {active.role === "TREASURER" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Family contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {contact ? (
              <>
                <p className="font-medium">{contact.name}</p>
                <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:underline">
                  {contact.email}
                </a>
              </>
            ) : (
              <p className="text-muted-foreground">No guardian linked to this player yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Row label="Type" value={invoice.type} />
          <Row label="Amount" value={formatPence(invoice.amountPence)} />
          {invoice.discountPence ? <Row label="Discount" value={formatPence(invoice.discountPence)} /> : null}
          <Row label="Due date" value={invoice.dueDate.toLocaleDateString("en-GB")} />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          {invoice.waivedReason ? <Row label="Waived reason" value={invoice.waivedReason} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between py-2">
                  <span>{payment.paidAt.toLocaleDateString("en-GB")}</span>
                  <span className="text-muted-foreground">{payment.method}</span>
                  <span className="font-medium">{formatPence(payment.amountPence)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
