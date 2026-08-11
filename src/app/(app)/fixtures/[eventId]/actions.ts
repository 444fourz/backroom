"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { attendanceRecordSchema } from "@/lib/validation/event.schema";
import { writeAuditLog } from "@/lib/audit/log";

export async function recordAttendanceAction(formData: FormData) {
  const { user, active } = await requireCapability("attendance:record");

  const parsed = attendanceRecordSchema.safeParse({
    eventId: formData.get("eventId"),
    playerId: formData.get("playerId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  // Re-derive scope server-side — the event must be visible to this caller
  // (coach -> own team, admin -> own club) and the player must belong to
  // that same event's team. Never trust the posted ids alone.
  const event = await prisma.event.findFirst({
    where: {
      id: parsed.data.eventId,
      ...(active.role === "COACH" ? { teamId: active.teamId ?? "__none__" } : { clubId: active.clubId }),
    },
    select: { teamId: true },
  });
  if (!event) return;

  const player = await prisma.player.findFirst({
    where: { id: parsed.data.playerId, teamId: event.teamId },
  });
  if (!player) return;

  await prisma.attendance.upsert({
    where: { eventId_playerId: { eventId: parsed.data.eventId, playerId: parsed.data.playerId } },
    update: { status: parsed.data.status, recordedByUserId: user.id, recordedAt: new Date() },
    create: {
      eventId: parsed.data.eventId,
      playerId: parsed.data.playerId,
      status: parsed.data.status,
      recordedByUserId: user.id,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "attendance.recorded",
    entityType: "Attendance",
    entityId: `${parsed.data.eventId}:${parsed.data.playerId}`,
    metadata: { status: parsed.data.status },
  });

  revalidatePath(`/fixtures/${parsed.data.eventId}`);
}
