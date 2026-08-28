import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { listCredentialsForMembership, isExpiringSoon } from "@/lib/data/credentials";
import { listRegistrationsForMembership } from "@/lib/data/registration";
import { roleHasCapability } from "@/lib/permissions/policies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { CredentialStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
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

function chaseMailto(name: string, email: string, type: string, expiryDate: Date) {
  const subject = `${type.replaceAll("_", " ").toLowerCase()} renewal needed`;
  const body = `Hi ${name},\n\nJust a heads up that your ${type.replaceAll("_", " ").toLowerCase()} expires on ${expiryDate.toLocaleDateString("en-GB")}. Could you get a renewal booked in and let us know once it's done?\n\nThanks,\nAston Rovers FC`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function SafeguardingPage() {
  // Hard-blocked for treasurer and guardian at the route, not just hidden
  // from nav — this boundary is worth checking by hand per the plan.
  const { active } = await requireAnyCapability([
    "credential:view:club",
    "credential:view:own",
    "credential:status:view",
  ]);
  const canSeeRegistrations = roleHasCapability(active.role, "registration:view:all");

  const [credentials, registrations] = await Promise.all([
    listCredentialsForMembership(active),
    canSeeRegistrations ? listRegistrationsForMembership(active) : Promise.resolve([]),
  ]);

  const inDateCount = credentials.filter((credential) => !isExpiringSoon(credential.expiryDate)).length;
  const expiring = credentials
    .filter((credential) => isExpiringSoon(credential.expiryDate))
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  const completeRegistrations = registrations.filter((registration) => registration.status === "COMPLETE").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Safeguarding</h1>
        <p className="text-sm text-muted-foreground">
          {DESCRIPTION[active.role] ?? "DBS and certificate status."}
        </p>
      </div>

      <div className={cn("grid gap-4", canSeeRegistrations ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">DBS &amp; certificates in date</p>
            <p className="text-2xl font-semibold tracking-tight">
              {inDateCount} <span className="text-base font-normal text-muted-foreground">/ {credentials.length}</span>
            </p>
          </CardContent>
        </Card>
        {canSeeRegistrations ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Consents complete</p>
              <p className="text-2xl font-semibold tracking-tight">
                {completeRegistrations}{" "}
                <span className="text-base font-normal text-muted-foreground">/ {registrations.length}</span>
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {expiring.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expiring soon</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y p-0">
            {expiring.map((credential) => {
              const urgent = credential.expiryDate.getTime() - Date.now() < 7 * 86400000;
              return (
                <div
                  key={credential.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3",
                    urgent ? "bg-destructive/5" : undefined,
                  )}
                >
                  <div>
                    <Link
                      href={`/safeguarding/credentials/${credential.id}`}
                      className={cn("font-medium hover:underline", urgent ? "text-destructive" : undefined)}
                    >
                      {credential.user.name} · {credential.type.toLowerCase().replaceAll("_", " ")}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Expires {credential.expiryDate.toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={chaseMailto(credential.user.name, credential.user.email, credential.type, credential.expiryDate)}>
                      Chase
                    </a>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {credentials.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No credentials on file" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All credentials</CardTitle>
          </CardHeader>
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

      {canSeeRegistrations ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">Access log</p>
              <p className="text-sm text-muted-foreground">Every view of a medical or safeguarding record.</p>
            </div>
            <Button variant="outline" disabled title="Not built yet — audit entries are recorded but not browsable">
              View log
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
