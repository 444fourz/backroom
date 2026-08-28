import { prisma } from "@/lib/db/prisma";
import { getGuardianAvailabilityForEvent } from "@/lib/data/events";

/**
 * Guardian-scoped reads for the mobile API — these take a raw
 * `guardianUserId` rather than a web `Membership`, since a guardian's
 * children (and the mobile app's view of them) span every club they belong
 * to at once. There's no "active club" concept on mobile; the web app's
 * per-request club/team scoping doesn't apply here.
 */

export async function listGuardianChildren(guardianUserId: string) {
  return prisma.player.findMany({
    where: { guardians: { some: { guardianUserId } }, status: "ACTIVE" },
    include: { team: { include: { club: { select: { id: true, name: true } } } } },
    orderBy: { firstName: "asc" },
  });
}

export async function listGuardianUpcomingEvents(guardianUserId: string) {
  return prisma.event.findMany({
    where: {
      startTime: { gte: new Date() },
      team: { players: { some: { guardians: { some: { guardianUserId } }, status: "ACTIVE" } } },
    },
    include: {
      team: { select: { id: true, name: true } },
      club: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 25,
  });
}

/** Upcoming events paired with each linked child's availability response — the mobile "needs a reply" list. */
export async function listGuardianAvailability(guardianUserId: string) {
  const events = await listGuardianUpcomingEvents(guardianUserId);

  const withChildren = await Promise.all(
    events.map(async (event) => ({
      event,
      children: await getGuardianAvailabilityForEvent(guardianUserId, event.id),
    })),
  );

  return withChildren.filter(({ children }) => children.length > 0);
}
