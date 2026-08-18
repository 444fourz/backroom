import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { listCredentialsForMembership } from "@/lib/data/credentials";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CredentialStatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DESCRIPTION: Record<string, string> = {
  WELFARE_OFFICER: "DBS and certificate records across the club.",
  SECRETARY: "Whether each coach's DBS is in date. The certificates themselves aren't shown here.",
  COACH: "Your own DBS and certificates.",
};

export default async function SafeguardingPage() {
  // Hard-blocked for treasurer and guardian at the route, not just hidden
  // from nav — this boundary is worth checking by hand per the plan.
  const { active } = await requireAnyCapability([
    "credential:view:club",
    "credential:view:own",
    "credential:status:view",
  ]);
  const credentials = await listCredentialsForMembership(active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Safeguarding</h1>
        <p className="text-sm text-muted-foreground">
          {DESCRIPTION[active.role] ?? "DBS and certificate status."}
        </p>
      </div>

      {credentials.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No credentials on file" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell>{credential.user.name}</TableCell>
                    <TableCell className="capitalize">{credential.type.toLowerCase().replaceAll("_", " ")}</TableCell>
                    <TableCell>
                      <Link href={`/safeguarding/credentials/${credential.id}`} className="hover:underline">
                        {credential.expiryDate.toLocaleDateString("en-GB")}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CredentialStatusBadge expiryDate={credential.expiryDate} />
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
