import { NextResponse } from "next/server";

import { mobileRoute } from "@/lib/auth/mobile";
import { listGuardianUpcomingEvents } from "@/lib/data/mobile";

export const GET = mobileRoute(async (_req, user) => {
  const events = await listGuardianUpcomingEvents(user.id);

  return NextResponse.json({
    fixtures: events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      opponent: event.opponent,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      venueMapUrl: event.venueMapUrl,
      meetTime: event.meetTime,
      startTime: event.startTime,
      endTime: event.endTime,
      kitColour: event.kitColour,
      team: event.team,
      club: event.club,
    })),
  });
});
