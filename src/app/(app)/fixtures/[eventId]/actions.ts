"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { attendanceRecordSchema, matchStatRecordSchema } from "@/lib/validation/event.schema";
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

export async function recordMatchStatAction(formData: FormData) {
  const { user, active } = await requireCapability("matchstat:record");

  const parsed = matchStatRecordSchema.safeParse({
    eventId: formData.get("eventId"),
    playerId: formData.get("playerId"),
    goals: formData.get("goals"),
    assists: formData.get("assists"),
  });
  if (!parsed.success) return;

  // Re-derive scope server-side, same as recordAttendanceAction — the event
  // must be visible to this caller and the player must belong to that same
  // event's team. Never trust the posted ids alone.
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

  await prisma.matchStat.upsert({
    where: { eventId_playerId: { eventId: parsed.data.eventId, playerId: parsed.data.playerId } },
    update: { goals: parsed.data.goals, assists: parsed.data.assists, recordedByUserId: user.id, recordedAt: new Date() },
    create: {
      eventId: parsed.data.eventId,
      playerId: parsed.data.playerId,
      goals: parsed.data.goals,
      assists: parsed.data.assists,
      recordedByUserId: user.id,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "matchstat.recorded",
    entityType: "MatchStat",
    entityId: `${parsed.data.eventId}:${parsed.data.playerId}`,
    metadata: { goals: parsed.data.goals, assists: parsed.data.assists },
  });

  revalidatePath(`/fixtures/${parsed.data.eventId}`);
  revalidatePath(`/players/${parsed.data.playerId}`);
  revalidatePath("/stats");
}
