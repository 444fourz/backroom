import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { listEventsForMembership } from "@/lib/data/events";
import { Button } from "@/components/ui/button";
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

export default async function FixturesPage() {
  const { active } = await requireCapability("event:view");
  const events = await listEventsForMembership(active);
  const canCreate = active.role === "ADMIN" || active.role === "COACH";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fixtures</h1>
          <p className="text-sm text-muted-foreground">Matches, tournaments and training sessions.</p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/fixtures/new">
              <Plus className="size-4" />
              New fixture
            </Link>
          </Button>
        ) : null}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No fixtures yet"
          description="Once fixtures are added they'll show up here, grouped by date."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fixture</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Kit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">
                      {event.startTime.toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/fixtures/${event.id}`} className="font-medium hover:underline">
                        {event.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{event.type}</div>
                    </TableCell>
                    <TableCell>{event.team.name}</TableCell>
                    <TableCell>{event.venueName}</TableCell>
                    <TableCell>{event.kitColour ?? "—"}</TableCell>
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
