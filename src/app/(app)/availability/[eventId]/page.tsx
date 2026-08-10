import { notFound } from "next/navigation";

import { requireCapability } from "@/lib/permissions/guard";
import { getEventForMembership, getGuardianAvailabilityForEvent } from "@/lib/data/events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvailabilityStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

import { respondAvailabilityAction } from "./actions";

export default async function AvailabilityDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { user, active } = await requireCapability("availability:respond");

  const event = await getEventForMembership(active, eventId);
  if (!event) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {event.team.name} ·{" "}
          {event.startTime.toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {active.role === "GUARDIAN" ? (
        <GuardianResponseCard guardianUserId={user.id} eventId={eventId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Responses</CardTitle>
            <CardDescription>{event.availability.length} player(s) have responded so far.</CardDescription>
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
      )}
    </div>
  );
}

async function GuardianResponseCard({
  guardianUserId,
  eventId,
}: {
  guardianUserId: string;
  eventId: string;
}) {
  const rows = await getGuardianAvailabilityForEvent(guardianUserId, eventId);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          None of your children play on this team.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Let the coach know</CardTitle>
        <CardDescription>Your response updates instantly — no need to save.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map(({ player, response }) => (
          <div key={player.id} className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0">
            <p className="font-medium">
              {player.firstName} {player.lastName}
            </p>
            <div className="flex gap-2">
              {(["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const).map((status) => (
                <form key={status} action={respondAvailabilityAction}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="playerId" value={player.id} />
                  <input type="hidden" name="status" value={status} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={response?.status === status ? "default" : "outline"}
                    className={cn("capitalize")}
                  >
                    {status.toLowerCase()}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
