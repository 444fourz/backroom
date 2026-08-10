"use server";

import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { createEventSchema } from "@/lib/validation/event.schema";

function fail(message: string): never {
  redirect(`/fixtures/new?error=${encodeURIComponent(message)}`);
}

export async function createEventAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("event:create");

  if (!active.teamId && active.role !== "ADMIN") {
    fail("You need to be scoped to a team to create a fixture.");
  }

  const parsed = createEventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    opponent: formData.get("opponent") ?? "",
    venueName: formData.get("venueName"),
    venueAddress: formData.get("venueAddress") ?? "",
    meetTime: formData.get("meetTime") ?? "",
    startTime: formData.get("startTime"),
    kitColour: formData.get("kitColour") ?? "",
  });

  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Check the fixture details.");
  }

  // Admin isn't locked to one team, so a team must be posted explicitly for
  // them; a coach is always scoped to their own active membership's team.
  const teamId = active.role === "ADMIN" ? String(formData.get("teamId") ?? "") : active.teamId!;
  if (!teamId) {
    fail("Choose a team for this fixture.");
  }
  const team = await prisma.team.findFirst({ where: { id: teamId, clubId: active.clubId } });
  if (!team) {
    fail("That team isn't part of your club.");
  }

  const event = await prisma.event.create({
    data: {
      clubId: active.clubId,
      teamId: team.id,
      type: parsed.data.type,
      title: parsed.data.title,
      opponent: parsed.data.opponent || null,
      venueName: parsed.data.venueName,
      venueAddress: parsed.data.venueAddress || null,
      meetTime: parsed.data.meetTime ? new Date(parsed.data.meetTime) : null,
      startTime: new Date(parsed.data.startTime),
      kitColour: parsed.data.kitColour || null,
      createdByUserId: user.id,
    },
  });

  redirect(`/fixtures/${event.id}`);
}
