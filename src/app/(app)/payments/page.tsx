import Link from "next/link";
import { Wallet } from "lucide-react";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { listInvoicesForMembership } from "@/lib/data/payments";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatPence(pence: number) {
  return (pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export default async function PaymentsPage() {
  const { active } = await requireAnyCapability(["payment:view:all", "payment:view:own"]);

  const invoices = await listInvoicesForMembership(active);
  const isTreasurerView = active.role === "TREASURER";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {isTreasurerView ? "Subs, match fees and kit charges across the club." : "Your family's subs and fees."}
          </p>
        </div>
        {isTreasurerView ? (
          <Button asChild variant="outline">
            <Link href="/payments/arrears">View arrears</Link>
          </Button>
        ) : null}
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={Wallet} title="No invoices yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.player.firstName} {invoice.player.lastName}
                    </TableCell>
                    <TableCell>
                      <Link href={`/payments/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.description}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {invoice.dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell>{formatPence(invoice.amountPence)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
