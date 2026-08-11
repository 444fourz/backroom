"use server";

import { revalidatePath } from "next/cache";

import { requireActiveMembership } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { availabilityResponseSchema } from "@/lib/validation/event.schema";
import { writeAuditLog } from "@/lib/audit/log";

export async function respondAvailabilityAction(formData: FormData) {
  const { user, active } = await requireActiveMembership();

  const parsed = availabilityResponseSchema.safeParse({
    eventId: formData.get("eventId"),
    playerId: formData.get("playerId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  // Ownership check happens here, not in the UI: a guardian can only ever
  // write a response for a player they're actually linked to.
  if (active.role !== "GUARDIAN") return;
  const isOwnChild = await prisma.guardianPlayer.findFirst({
    where: { guardianUserId: user.id, playerId: parsed.data.playerId },
  });
  if (!isOwnChild) return;

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
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/availability/${parsed.data.eventId}`);
}
