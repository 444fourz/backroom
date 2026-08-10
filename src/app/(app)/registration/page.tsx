import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { listRegistrationsForMembership } from "@/lib/data/registration";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { RegistrationStatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RegistrationPage() {
  const { active } = await requireAnyCapability(["registration:view:all", "registration:view:own"]);
  const registrations = await listRegistrationsForMembership(active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registration</h1>
        <p className="text-sm text-muted-foreground">
          {active.role === "ADMIN"
            ? "Season registration and consent completion across the club."
            : "Your children's season registration and consents."}
        </p>
      </div>

      {registrations.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No registrations yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <Link href={`/registration/${registration.player.id}`} className="hover:underline">
                        {registration.player.firstName} {registration.player.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{registration.season.label}</TableCell>
                    <TableCell>
                      <RegistrationStatusBadge status={registration.status} />
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
