import { requireCapability } from "@/lib/permissions/guard";
import { listSeasonsForClub } from "@/lib/data/club";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SeasonsPage() {
  const { active } = await requireCapability("club:manage");
  const seasons = await listSeasonsForClub(active);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seasons</h1>
          <p className="text-sm text-muted-foreground">Season rollover carries teams and players forward.</p>
        </div>
        <Button variant="outline" disabled>
          Roll over to new season
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Season</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell className="font-medium">{season.label}</TableCell>
                  <TableCell>{season.startDate.toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>{season.endDate.toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>
                    {season.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Past</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
