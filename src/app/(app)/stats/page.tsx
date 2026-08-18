import Link from "next/link";
import { Trophy } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { listStatsLeaderboard } from "@/lib/data/stats";
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

export default async function StatsPage() {
  const { active } = await requireCapability("player:view:team");

  const leaderboard = await listStatsLeaderboard(active);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Goals, assists and appearances, recorded from each fixture&apos;s Match stats card.
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <EmptyState icon={Trophy} title="No stats recorded yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Appearances</TableHead>
                  <TableHead className="text-right">Goals</TableHead>
                  <TableHead className="text-right">Assists</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/players/${row.id}`} className="font-medium hover:underline">
                        {row.firstName} {row.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell className="text-right">{row.appearances}</TableCell>
                    <TableCell className="text-right">{row.goals}</TableCell>
                    <TableCell className="text-right">{row.assists}</TableCell>
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
