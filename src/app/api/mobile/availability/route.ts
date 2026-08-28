import { NextResponse } from "next/server";

import { mobileRoute } from "@/lib/auth/mobile";
import { listGuardianAvailability } from "@/lib/data/mobile";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { availabilityResponseSchema } from "@/lib/validation/event.schema";

export const GET = mobileRoute(async (_req, user) => {
  const items = await listGuardianAvailability(user.id);

  return NextResponse.json({
    events: items.map(({ event, children }) => ({
      event: {
        id: event.id,
        type: event.type,
        title: event.title,
        startTime: event.startTime,
        team: event.team,
      },
      children: children.map(({ player, response }) => ({
        player,
        status: response?.status ?? "NO_RESPONSE",
      })),
    })),
  });
});

export const POST = mobileRoute(async (req, user) => {
  const body = await req.json().catch(() => null);
  const parsed = availabilityResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  // Same ownership boundary as the web action (respondAvailabilityAction):
  // re-derive that this is actually the guardian's own child server-side
  // before writing anything, never trust the posted playerId alone.
  const isOwnChild = await prisma.guardianPlayer.findFirst({
    where: { guardianUserId: user.id, playerId: parsed.data.playerId },
  });
  if (!isOwnChild) {
    return NextResponse.json({ error: "That player isn't linked to your account." }, { status: 403 });
  }

  await prisma.availabilityResponse.upsert({
    where: { eventId_playerId: { eventId: parsed.data.eventId, playerId: parsed.data.playerId } },
    update: { status: parsed.data.status, respondedByUserId: user.id, respondedAt: new Date() },
    create: {
      eventId: parsed.data.eventId,
      playerId: parsed.data.playerId,
      status: parsed.data.status,
      respondedByUserId: user.id,
      respondedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "availability.responded",
    entityType: "AvailabilityResponse",
    entityId: `${parsed.data.eventId}:${parsed.data.playerId}`,
    metadata: { status: parsed.data.status, via: "mobile" },
  });

  return NextResponse.json({ ok: true });
});
