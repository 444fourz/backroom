import { notFound } from "next/navigation";

import { requireCapability } from "@/lib/permissions/guard";
import { getTeamForClub } from "@/lib/data/club";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { active } = await requireCapability("club:manage");

  const team = await getTeamForClub(active, teamId);
  if (!team) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
        <p className="text-sm text-muted-foreground">{team.ageGroup}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Players ({team.players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y text-sm">
              {team.players.map((player) => (
                <li key={player.id} className="py-2">
                  {player.firstName} {player.lastName}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff & guardians</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y text-sm">
              {team.memberships.map((membership) => (
                <li key={membership.id} className="flex items-center justify-between py-2">
                  <span>{membership.user.name}</span>
                  <Badge variant="secondary" className="capitalize">
                    {membership.role.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
