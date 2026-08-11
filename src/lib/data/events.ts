import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

function eventScopeWhere(active: Membership) {
  switch (active.role) {
    case "ADMIN":
    case "TREASURER":
      return { clubId: active.clubId };
    case "COACH":
      return { teamId: active.teamId ?? "__none__" };
    case "GUARDIAN":
      // A guardian sees fixtures for any team one of their children plays on.
      return {
        team: {
          players: {
            some: { guardians: { some: { guardianUserId: active.userId } } },
          },
        },
      };
    default:
      return { id: "__none__" };
  }
}

export async function listEventsForMembership(active: Membership) {
  return prisma.event.findMany({
    where: eventScopeWhere(active),
    include: { team: true },
    orderBy: { startTime: "asc" },
  });
}

export async function getEventForMembership(active: Membership, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, ...eventScopeWhere(active) },
    include: {
      team: true,
      availability: {
        include: {
          player: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      attendance: {
        include: {
          player: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
}

/**
 * A guardian's own children who play on this event's team, each paired with
 * their existing response (or a NO_RESPONSE placeholder if none exists yet)
 * — used by the /availability/[eventId] response toggle. Scoped to
 * guardianUserId so a guardian only ever sees/updates their own children,
 * never anyone else's.
 */
export async function getGuardianAvailabilityForEvent(guardianUserId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { teamId: true } });
  if (!event) return [];

  const children = await prisma.player.findMany({
    where: { teamId: event.teamId, guardians: { some: { guardianUserId } } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      availabilityResponses: { where: { eventId }, take: 1 },
    },
    orderBy: { firstName: "asc" },
  });

  return children.map((child) => ({
    player: { id: child.id, firstName: child.firstName, lastName: child.lastName },
    response: child.availabilityResponses[0] ?? null,
  }));
}

/**
 * The full team roster for an event, each paired with their existing
 * attendance record (or null if not yet marked) — used by the attendance
 * marking UI on the fixture detail page. Only ADMIN/COACH ever call this;
 * scoped the same way as event visibility (coach -> own team, admin -> own
 * club), and returns null entirely if the event is out of the caller's
 * scope so a coach can't probe another team's roster via the eventId.
 */
export async function getAttendanceRosterForEvent(active: Membership, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScopeWhere(active) },
    select: { teamId: true },
  });
  if (!event) return null;

  const players = await prisma.player.findMany({
    where: { teamId: event.teamId, status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      attendance: { where: { eventId }, take: 1 },
    },
    orderBy: { firstName: "asc" },
  });

  return players.map((player) => ({
    player: { id: player.id, firstName: player.firstName, lastName: player.lastName },
    attendance: player.attendance[0] ?? null,
  }));
}
