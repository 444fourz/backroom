import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { roleHasCapability } from "@/lib/permissions/policies";
import { listEventsForMembership, getAvailabilityBreakdownForEvent } from "@/lib/data/events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import { CopyMatchDetailsButton } from "./fixture-controls";

export default async function FixturesPage() {
  const { active } = await requireCapability("event:view");
  const events = await listEventsForMembership(active);
  const canCreate = roleHasCapability(active.role, "event:create");

  const now = new Date();
  const upcoming = events.filter((event) => event.startTime > now).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const nextEvent = upcoming[0];
  const comingUp = upcoming.slice(1, 4);

  const availability =
    nextEvent && nextEvent.type === "MATCH"
      ? await getAvailabilityBreakdownForEvent(nextEvent.id, nextEvent.teamId)
      : null;

  const matchDetailsText = nextEvent
    ? [
        `${nextEvent.title} — ${nextEvent.team.name}`,
        nextEvent.startTime.toLocaleString("en-GB", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }),
        nextEvent.meetTime ? `Meet at ${nextEvent.meetTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : null,
        `Venue: ${nextEvent.venueName}${nextEvent.venueAddress ? `, ${nextEvent.venueAddress}` : ""}`,
        nextEvent.kitColour ? `Kit: ${nextEvent.kitColour}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

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

      {nextEvent ? (
        <Card className="border-t-[3px] border-t-primary">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next up</p>
                <Link href={`/fixtures/${nextEvent.id}`} className="text-lg font-medium hover:underline">
                  {nextEvent.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {nextEvent.team.name} ·{" "}
                  {nextEvent.startTime.toLocaleString("en-GB", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <Badge variant="secondary">{nextEvent.type}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {nextEvent.meetTime ? (
                <div className="rounded-sm bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Meet at</p>
                  <p className="font-medium">
                    {nextEvent.meetTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ) : null}
              {nextEvent.kitColour ? (
                <div className="rounded-sm bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Kit</p>
                  <p className="font-medium">{nextEvent.kitColour}</p>
                </div>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {nextEvent.venueName}
              {nextEvent.venueAddress ? ` · ${nextEvent.venueAddress}` : ""}
            </p>

            {availability ? (
              <p className="text-sm">
                {availability.available} of {availability.rosterSize} available
              </p>
            ) : null}

            {canCreate ? (
              <div>
                <CopyMatchDetailsButton text={matchDetailsText} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {comingUp.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {comingUp.map((event) => (
              <Link
                key={event.id}
                href={`/fixtures/${event.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent"
              >
                <div>
                  <span className="font-medium">{event.title}</span>
                  <span className="ml-2 text-muted-foreground">{event.team.name}</span>
                </div>
                <span className="text-muted-foreground">
                  {event.startTime.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
