import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { requireActiveMembership } from "@/lib/auth/session";
import { listPlayersForMembership } from "@/lib/data/players";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PlayersPage() {
  const { active } = await requireActiveMembership();

  // Treasurer works from Invoice/Payment records, not the player roster —
  // redirect rather than showing an empty page.
  if (active.role === "TREASURER") redirect("/payments");

  const players = await listPlayersForMembership(active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
        <p className="text-sm text-muted-foreground">
          {active.role === "GUARDIAN" ? "Your children." : "Everyone on the roster."}
        </p>
      </div>

      {players.length === 0 ? (
        <EmptyState icon={Users} title="No players yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Link href={`/players/${player.id}`} className="font-medium hover:underline">
                        {player.firstName} {player.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{player.dateOfBirth.toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>
                      <Badge variant={player.status === "ACTIVE" ? "default" : "secondary"}>
                        {player.status.toLowerCase()}
                      </Badge>
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
