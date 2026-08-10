import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { listEventsForMembership } from "@/lib/data/events";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default async function AvailabilityPage() {
  const { active } = await requireCapability("availability:respond");

  const events = await listEventsForMembership(active);
  const upcoming = events.filter((event) => event.startTime > new Date());

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          {active.role === "GUARDIAN"
            ? "Let the coach know who's available for upcoming sessions."
            : "See who's responded for each upcoming fixture."}
        </p>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No upcoming fixtures" description="Nothing needs a response right now." />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {upcoming.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.team.name} ·{" "}
                    {event.startTime.toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/availability/${event.id}`}>
                    {active.role === "GUARDIAN" ? "Respond" : "View responses"}
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
