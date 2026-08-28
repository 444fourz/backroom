import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { listArrearsForMembership } from "@/lib/data/payments";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
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

export default async function ArrearsPage() {
  const { active } = await requireCapability("payment:manage");
  const arrears = await listArrearsForMembership(active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arrears</h1>
        <p className="text-sm text-muted-foreground">Invoices that are pending, partial or overdue, by family.</p>
      </div>

      {arrears.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No arrears" description="Every invoice is fully paid." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Family contact</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrears.map((invoice) => {
                  const contact = invoice.player.guardians[0]?.guardian;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {invoice.player.firstName} {invoice.player.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact ? (
                          <>
                            {contact.name}
                            <br />
                            <a href={`mailto:${contact.email}`} className="hover:underline">
                              {contact.email}
                            </a>
                          </>
                        ) : (
                          "No guardian linked"
                        )}
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
