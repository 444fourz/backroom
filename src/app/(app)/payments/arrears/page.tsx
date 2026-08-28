import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import {
  listArrearsForMembership,
  listArrearsNeedingDecision,
  getArrearsSummary,
  getMonthlyCollectionSummary,
} from "@/lib/data/payments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

import { waiveInvoiceAction, createPaymentPlanAction } from "../actions";
import { WaiveInvoiceDialog, PaymentPlanDialog } from "./arrears-controls";

function formatPence(pence: number) {
  return (pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

const BUCKET_LABEL: Record<string, string> = { "0-30": "0–30 days", "30-60": "30–60 days", "60+": "60+ days" };

function reminderMailto(contact: { name: string; email: string }, description: string, pence: number, dueDate: Date) {
  const subject = `Reminder: ${description}`;
  const body = `Hi ${contact.name},\n\nJust a friendly reminder that ${formatPence(pence)} for "${description}" was due on ${dueDate.toLocaleDateString("en-GB")}. Let us know if you'd like to arrange a payment plan instead.\n\nThanks,\nAston Rovers FC`;
  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function ArrearsPage() {
  const { active } = await requireCapability("payment:manage");
  const [arrears, needsDecision, summary, collections] = await Promise.all([
    listArrearsForMembership(active),
    listArrearsNeedingDecision(active),
    getArrearsSummary(active),
    getMonthlyCollectionSummary(active),
  ]);

  const expectedPence = collections?.expectedPence ?? 0;
  const collectedPence = collections?.collectedPence ?? 0;
  const collectedPct = expectedPence > 0 ? Math.round((collectedPence / expectedPence) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arrears</h1>
        <p className="text-sm text-muted-foreground">Invoices that are pending, partial or overdue, by family.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Collected this month</p>
            <p className="text-2xl font-semibold tracking-tight">{formatPence(collectedPence)}</p>
            {collectedPct !== null ? (
              <p className="text-xs text-muted-foreground">{collectedPct}% of expected</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-semibold tracking-tight text-destructive">
              {formatPence(summary?.totalPence ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{summary?.familyCount ?? 0} families</p>
          </CardContent>
        </Card>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Paid straight into the club&apos;s account. Never held by ClubCore.</p>

      {summary && summary.totalPence > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Arrears by age</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {summary.buckets.map((bucket) => (
                  <TableRow key={bucket.key} className={bucket.key === "60+" && bucket.pence > 0 ? "bg-destructive/5" : undefined}>
                    <TableCell className={bucket.key === "60+" && bucket.pence > 0 ? "text-destructive" : undefined}>
                      {BUCKET_LABEL[bucket.key]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{bucket.familyCount} families</TableCell>
                    <TableCell className="text-right font-medium">{formatPence(bucket.pence)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {needsDecision.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs a decision</CardTitle>
            <CardDescription>Furthest overdue first.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y p-0">
            {needsDecision.map((invoice) => {
              const contact = invoice.player.guardians[0]?.guardian;
              return (
                <div key={invoice.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {invoice.player.firstName} {invoice.player.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.daysOverdue} days overdue · {formatPence(invoice.outstandingPence)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PaymentPlanDialog
                      action={createPaymentPlanAction}
                      invoiceId={invoice.id}
                      playerName={`${invoice.player.firstName} ${invoice.player.lastName}`}
                      outstandingLabel={formatPence(invoice.outstandingPence)}
                    />
                    <WaiveInvoiceDialog
                      action={waiveInvoiceAction}
                      invoiceId={invoice.id}
                      playerName={`${invoice.player.firstName} ${invoice.player.lastName}`}
                    />
                    {contact ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={reminderMailto(contact, invoice.description, invoice.outstandingPence, invoice.dueDate)}>
                          Remind
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

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
