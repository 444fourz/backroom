import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { requireActiveMembership } from "@/lib/auth/session";
import { roleHasCapability } from "@/lib/permissions/policies";
import { listPlayersForMembership } from "@/lib/data/players";
import { listTeamsForClub } from "@/lib/data/club";
import { getArrearsSignalForWelfare } from "@/lib/data/payments";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/shared/row-actions";
import { ActionToast } from "@/components/shared/action-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { renamePlayerAction, updatePlayerAction } from "./actions";
import { MovePlayerForm, RenamePlayerForm } from "./player-forms";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { active } = await requireActiveMembership();

  // Treasurer works from Invoice/Payment records, not the player roster —
  // redirect rather than showing an empty page.
  if (active.role === "TREASURER") redirect("/payments");

  const players = await listPlayersForMembership(active);
  const canManage = roleHasCapability(active.role, "club:manage");
  const teams = canManage ? await listTeamsForClub(active) : [];
  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name }));
  const arrearsSignal = await getArrearsSignalForWelfare(active);
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <ActionToast param="ok" message="Saved" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
        <p className="text-sm text-muted-foreground">
          {active.role === "GUARDIAN" ? "Your children." : "Everyone on the roster."}
        </p>
      </div>

      {error ? (
        <div className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

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
                  {arrearsSignal ? <TableHead>Arrears</TableHead> : null}
                  {canManage ? (
                    <TableHead className="w-10 text-right">
                      <span className="sr-only">Manage</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id} className="group/row">
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
                    {arrearsSignal ? (
                      <TableCell>
                        {arrearsSignal.has(player.id) ? (
                          <Badge variant="destructive">In arrears</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    {canManage ? (
                      <TableCell className="text-right">
                        <RowActions
                          label={`${player.firstName} ${player.lastName}`}
                          actions={[
                            {
                              label: "Correct name",
                              dialogTitle: "Correct name",
                              form: (
                                <RenamePlayerForm
                                  action={renamePlayerAction}
                                  playerId={player.id}
                                  firstName={player.firstName}
                                  lastName={player.lastName}
                                />
                              ),
                            },
                            {
                              label: "Team & status",
                              dialogTitle: `Move ${player.firstName}`,
                              dialogDescription:
                                "Changing team also changes which coach can see this player.",
                              form: (
                                <MovePlayerForm
                                  action={updatePlayerAction}
                                  playerId={player.id}
                                  currentTeamId={player.teamId}
                                  currentStatus={player.status}
                                  teams={teamOptions}
                                />
                              ),
                            },
                            {
                              label: "Manage guardians",
                              dialogTitle: "Guardians",
                              dialogDescription: "Open the player's profile to link or unlink guardians.",
                              form: (
                                <p className="text-sm">
                                  <Link
                                    href={`/players/${player.id}`}
                                    className="text-primary underline underline-offset-2"
                                  >
                                    Open {player.firstName}&apos;s profile
                                  </Link>{" "}
                                  to manage who can see this child.
                                </p>
                              ),
                            },
                          ]}
                        />
                      </TableCell>
                    ) : null}
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
