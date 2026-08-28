import { notFound } from "next/navigation";

import { requireCapability } from "@/lib/permissions/guard";
import {
  getEventForMembership,
  getGuardianAvailabilityForEvent,
  getAvailabilityBreakdownForEvent,
  getAvailabilityRosterForEvent,
  listNonRespondersForEvent,
} from "@/lib/data/events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvailabilityStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { Membership } from "@prisma/client";

import { respondAvailabilityAction } from "./actions";
import { NudgeButton } from "./availability-controls";

function timeAgo(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
        <ResponsesCard active={active} eventId={eventId} teamId={event.teamId} />
      )}
    </div>
  );
}

async function ResponsesCard({
  active,
  eventId,
  teamId,
}: {
  active: Membership;
  eventId: string;
  teamId: string;
}) {
  const [breakdown, roster, nonResponders] = await Promise.all([
    getAvailabilityBreakdownForEvent(eventId, teamId),
    getAvailabilityRosterForEvent(active, eventId),
    listNonRespondersForEvent(active, eventId),
  ]);

  const segments = [
    { key: "available", count: breakdown.available, className: "bg-emerald-500" },
    { key: "unavailable", count: breakdown.unavailable, className: "bg-destructive" },
    { key: "maybe", count: breakdown.maybe, className: "bg-amber-500" },
    { key: "waiting", count: breakdown.waiting, className: "bg-muted" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Responses</CardTitle>
        <CardDescription>{breakdown.rosterSize} on the active roster.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {breakdown.rosterSize > 0 ? (
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {segments.map((segment) =>
              segment.count > 0 ? (
                <div
                  key={segment.key}
                  className={segment.className}
                  style={{ width: `${(segment.count / breakdown.rosterSize) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-emerald-700">{breakdown.available} available</span>
          <span className="text-destructive">{breakdown.unavailable} out</span>
          <span className="text-amber-700">{breakdown.maybe} maybe</span>
          <span className="text-muted-foreground">{breakdown.waiting} waiting</span>
        </div>

        {nonResponders.length > 0 ? <NudgeButton names={nonResponders} /> : null}

        {!roster || roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active players on this team yet.</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {roster.map(({ player, response }) => (
              <li key={player.id} className="flex flex-col gap-0.5 py-2">
                <div className="flex items-center justify-between">
                  <span className={cn(!response || response.status === "NO_RESPONSE" ? "text-muted-foreground" : undefined)}>
                    {player.firstName} {player.lastName}
                  </span>
                  {response && response.status !== "NO_RESPONSE" ? (
                    <span className="flex items-center gap-2">
                      {response.respondedAt ? (
                        <span className="text-xs text-muted-foreground">{timeAgo(response.respondedAt)}</span>
                      ) : null}
                      <AvailabilityStatusBadge status={response.status} />
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No reply</span>
                  )}
                </div>
                {response?.note ? <p className="text-xs text-muted-foreground">&ldquo;{response.note}&rdquo;</p> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
        <CardDescription>Your response updates instantly, no need to save.</CardDescription>
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
