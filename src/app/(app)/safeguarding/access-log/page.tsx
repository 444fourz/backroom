import { ShieldAlert } from "lucide-react";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { listSafeguardingAccessLog } from "@/lib/data/audit";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_LABEL: Record<string, string> = {
  "medical.viewed": "Viewed medical record",
  "credential.document.viewed": "Opened a DBS/certificate document",
  "registration.medical.updated": "Updated medical & allergy info",
  "registration.contact.updated": "Updated emergency contact",
  "registration.consent.updated": "Updated consent",
};

function timeAgo(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function AccessLogPage() {
  const { active } = await requireAnyCapability(["credential:view:club", "credential:status:view"]);
  const entries = await listSafeguardingAccessLog(active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access log</h1>
        <p className="text-sm text-muted-foreground">
          Every view of a medical or safeguarding record, most recent first.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nothing recorded yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Who</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.actor.name}</TableCell>
                    <TableCell>{ACTION_LABEL[entry.action] ?? entry.action}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.subjectName ?? "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{timeAgo(entry.createdAt)}</TableCell>
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
