import Link from "next/link";

import { requireCapability } from "@/lib/permissions/guard";
import { getClubOverview } from "@/lib/data/club";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ClubOverviewPage() {
  const { active } = await requireCapability("club:manage");
  const club = await getClubOverview(active);
  if (!club) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">{club.sport.toLowerCase()} club</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Teams" value={club.teams.length} href="/club/teams" />
        <SummaryCard label="Members" value={club._count.memberships} href="/club/members" />
        <SummaryCard label="Players" value={club._count.players} href="/players" />
        <SummaryCard label="Documents" value={club._count.documents} href="/club/documents" />
      </div>

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

function SummaryCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
