import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function listRegistrationsForMembership(active: Membership) {
  if (active.role === "ADMIN") {
    return prisma.registrationForm.findMany({
      where: { player: { clubId: active.clubId } },
      include: {
        player: { select: { id: true, firstName: true, lastName: true, teamId: true } },
        season: { select: { id: true, label: true } },
      },
      orderBy: [{ status: "asc" }],
    });
  }

  if (active.role === "GUARDIAN") {
    return prisma.registrationForm.findMany({
      where: { player: { guardians: { some: { guardianUserId: active.userId } } } },
      include: {
        player: { select: { id: true, firstName: true, lastName: true, teamId: true } },
        season: { select: { id: true, label: true } },
      },
      orderBy: [{ status: "asc" }],
    });
  }

  return [];
}

export async function getPlayerRegistrationForMembership(active: Membership, playerId: string) {
  const canAccess =
    active.role === "ADMIN"
      ? { clubId: active.clubId }
      : active.role === "GUARDIAN"
        ? { guardians: { some: { guardianUserId: active.userId } } }
        : null;

  if (!canAccess) return null;

  const player = await prisma.player.findFirst({
    where: { id: playerId, ...canAccess },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!player) return null;

  const [registrations, consents] = await Promise.all([
    prisma.registrationForm.findMany({
      where: { playerId },
      include: { season: { select: { id: true, label: true } } },
      orderBy: { season: { startDate: "desc" } },
    }),
    prisma.consent.findMany({
      where: { playerId },
      orderBy: { grantedAt: "desc" },
    }),
  ]);

  return { player, registrations, consents };
}
