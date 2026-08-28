import Link from "next/link";
import { Building2, FileText, Users, UsersRound } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { getClubOverview, listTeamsWithDbsStatus } from "@/lib/data/club";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";

import { updateArrearsSignalAction } from "./actions";

export default async function ClubOverviewPage() {
  const { active } = await requireCapability("club:manage");
  const [club, teams] = await Promise.all([getClubOverview(active), listTeamsWithDbsStatus(active)]);
  if (!club) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">{club.sport.toLowerCase()} club</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/club/teams" label="Teams" value={club.teams.length} icon={Building2} />
        <StatCard href="/club/members" label="Members" value={club._count.memberships} icon={UsersRound} />
        <StatCard href="/players" label="Players" value={club._count.players} icon={Users} />
        <StatCard href="/club/documents" label="Documents" value={club._count.documents} icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/club/teams/${team.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <div>
                <span className="font-medium">{team.name}</span>
                <span className="ml-2 text-muted-foreground">{team._count.players} players</span>
              </div>
              {team.dbsDue ? <Badge variant="destructive">DBS due</Badge> : null}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seasons</CardTitle>
          <CardDescription>
            <Link href="/club/seasons" className="underline underline-offset-2">
              Manage seasons
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y text-sm">
            {club.seasons.map((season) => (
              <li key={season.id} className="flex items-center justify-between py-2">
                <span>{season.label}</span>
                {season.isActive ? <span className="text-xs text-muted-foreground">Active</span> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Welfare officer visibility</CardTitle>
          <CardDescription>
            Hardship is sometimes something a welfare officer needs to know about. Turning this on
            lets them see that a family is in arrears — never an amount, never a due date.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {club.showArrearsToWelfare
              ? "On — the welfare officer sees which families are in arrears."
              : "Off — the welfare officer sees no financial detail at all."}
          </p>
          <form action={updateArrearsSignalAction}>
            <input type="hidden" name="enabled" value={String(!club.showArrearsToWelfare)} />
            <Button type="submit" variant="outline">
              {club.showArrearsToWelfare ? "Turn off" : "Turn on"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" disabled>
          Invite member
        </Button>
        <Button variant="outline" disabled>
          Season rollover
        </Button>
      </div>
    </div>
  );
}
