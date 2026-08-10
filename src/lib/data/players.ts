import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { roleHasCapability } from "@/lib/permissions/policies";

/**
 * Every function below takes the caller's *active* Membership (never a bare
 * userId) and builds its `where`/`select` from it. That's the enforcement
 * point for "treasurer can't see medical data" and "coach only sees their
 * own team" — a bug in a page component can't leak a field this layer never
 * selected in the first place.
 */

const PLAYER_LIST_FIELDS = {
  id: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  status: true,
  teamId: true,
  clubId: true,
} as const;

export async function listPlayersForMembership(active: Membership) {
  switch (active.role) {
    case "ADMIN":
      return prisma.player.findMany({
        where: { clubId: active.clubId },
        select: PLAYER_LIST_FIELDS,
        orderBy: [{ teamId: "asc" }, { lastName: "asc" }],
      });
    case "COACH":
      if (!active.teamId) return [];
      return prisma.player.findMany({
        where: { teamId: active.teamId },
        select: PLAYER_LIST_FIELDS,
        orderBy: { lastName: "asc" },
      });
    case "GUARDIAN":
      return prisma.player.findMany({
        where: { guardians: { some: { guardianUserId: active.userId } } },
        select: PLAYER_LIST_FIELDS,
        orderBy: { lastName: "asc" },
      });
    case "TREASURER":
      // No player:view:team capability — treasurer works from Invoice/Payment
      // records, not the player roster. See lib/data/payments.ts.
      return [];
    default:
      return [];
  }
}

/**
 * Fetch a single player, scoped to what this membership is allowed to see.
 * Returns null if the player doesn't exist *or* is out of scope — the
 * caller can't tell those apart, which is the point.
 */
export async function getPlayerForMembership(active: Membership, playerId: string) {
  const canSeeMedical =
    active.role === "GUARDIAN" || roleHasCapability(active.role, "medical:view");

  const scopeWhere =
    active.role === "ADMIN"
      ? { id: playerId, clubId: active.clubId }
      : active.role === "COACH"
        ? { id: playerId, teamId: active.teamId ?? "__none__" }
        : active.role === "GUARDIAN"
          ? { id: playerId, guardians: { some: { guardianUserId: active.userId } } }
          : { id: "__none__" }; // TREASURER and anything else: no access

  return prisma.player.findFirst({
    where: scopeWhere,
    include: {
      medical: canSeeMedical,
      guardians: { include: { guardian: { select: { id: true, name: true, email: true } } } },
      team: true,
    },
  });
}
