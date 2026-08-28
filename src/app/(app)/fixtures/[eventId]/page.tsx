import { notFound } from "next/navigation";
import Link from "next/link";
import type { Membership } from "@prisma/client";

import { requireCapability } from "@/lib/permissions/guard";
import { roleHasCapability } from "@/lib/permissions/policies";
import {
  getEventForMembership,
  getAttendanceRosterForEvent,
  getMatchStatRosterForEvent,
} from "@/lib/data/events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvailabilityStatusBadge, AttendanceStatusBadge } from "@/components/shared/status-badge";
import { ActionToast } from "@/components/shared/action-toast";
import { cn } from "@/lib/utils";

import { recordAttendanceAction, recordMatchStatAction } from "./actions";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { active } = await requireCapability("event:view");

  const event = await getEventForMembership(active, eventId);
  if (!event) notFound();

  const canRecordAttendance = roleHasCapability(active.role, "attendance:record");
  const canRecordMatchStats = event.type === "MATCH" && roleHasCapability(active.role, "matchstat:record");

  return (
    <div className="flex flex-col gap-4">
      <ActionToast param="created" message="Fixture created" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {event.team.name} · {event.type}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/availability/${event.id}`}>Availability</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Venue" value={event.venueName} />
            {event.venueAddress ? <Row label="Address" value={event.venueAddress} /> : null}
            {event.meetTime ? (
              <Row label="Meet time" value={event.meetTime.toLocaleString("en-GB")} />
            ) : null}
            <Row label="Start time" value={event.startTime.toLocaleString("en-GB")} />
            {event.opponent ? <Row label="Opponent" value={event.opponent} /> : null}
            {event.kitColour ? <Row label="Kit" value={event.kitColour} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Availability</CardTitle>
          </CardHeader>
          <CardContent>
            {event.availability.length === 0 ? (
              <p className="text-sm text-muted-foreground">No responses recorded yet.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {event.availability.map((response) => (
                  <li key={response.id} className="flex items-center justify-between py-2">
                    <span>
                      {response.player.firstName} {response.player.lastName}
                    </span>
                    <AvailabilityStatusBadge status={response.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {canRecordAttendance ? (
          <AttendanceCard active={active} eventId={event.id} />
        ) : event.attendance.length > 0 ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y text-sm">
                {event.attendance.map((record) => (
                  <li key={record.id} className="flex items-center justify-between py-2">
                    <span>
                      {record.player.firstName} {record.player.lastName}
                    </span>
                    <AttendanceStatusBadge status={record.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {canRecordMatchStats ? (
          <MatchStatsCard active={active} eventId={event.id} />
        ) : event.matchStats.length > 0 ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Match stats</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y text-sm">
                {event.matchStats.map((stat) => (
                  <li key={stat.id} className="flex items-center justify-between py-2">
                    <span>
                      {stat.player.firstName} {stat.player.lastName}
                    </span>
                    <span className="text-muted-foreground">
                      {stat.goals} {stat.goals === 1 ? "goal" : "goals"} · {stat.assists}{" "}
                      {stat.assists === 1 ? "assist" : "assists"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

async function AttendanceCard({
  active,
  eventId,
}: {
  active: Membership;
  eventId: string;
}) {
  const roster = await getAttendanceRosterForEvent(active, eventId);
  if (!roster) return null;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Attendance</CardTitle>
        <CardDescription>Mark who showed up, updates instantly, no need to save.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active players on this team yet.</p>
        ) : (
          roster.map(({ player, attendance }) => (
            <div
              key={player.id}
              className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-medium">
                {player.firstName} {player.lastName}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((status) => (
                  <form key={status} action={recordAttendanceAction}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="playerId" value={player.id} />
                    <input type="hidden" name="status" value={status} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={attendance?.status === status ? "default" : "outline"}
                      className={cn("capitalize")}
                    >
                      {status.toLowerCase()}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

async function MatchStatsCard({
  active,
  eventId,
}: {
  active: Membership;
  eventId: string;
}) {
  const roster = await getMatchStatRosterForEvent(active, eventId);
  if (!roster) return null;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Match stats</CardTitle>
        <CardDescription>Goals and assists per player, save each row separately.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active players on this team yet.</p>
        ) : (
          roster.map(({ player, stat }) => (
            <form
              key={player.id}
              action={recordMatchStatAction}
              className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="playerId" value={player.id} />
              <p className="font-medium">
                {player.firstName} {player.lastName}
              </p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Goals
                  <Input
                    type="number"
                    name="goals"
                    min={0}
                    max={99}
                    defaultValue={stat?.goals ?? 0}
                    className="w-16"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Assists
                  <Input
                    type="number"
                    name="assists"
                    min={0}
                    max={99}
                    defaultValue={stat?.assists ?? 0}
                    className="w-16"
                  />
                </label>
                <Button type="submit" size="sm" variant="outline">
                  Save
                </Button>
              </div>
            </form>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
