import { notFound } from "next/navigation";
import Link from "next/link";

import { requireCapability } from "@/lib/permissions/guard";
import { getEventForMembership } from "@/lib/data/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvailabilityStatusBadge, AttendanceStatusBadge } from "@/components/shared/status-badge";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { active } = await requireCapability("event:view");

  const event = await getEventForMembership(active, eventId);
  if (!event) notFound();

  return (
    <div className="flex flex-col gap-4">
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

        {event.attendance.length > 0 ? (
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
      </div>
    </div>
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
