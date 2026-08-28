import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { roleHasCapability } from "@/lib/permissions/policies";
import { writeAuditLog } from "@/lib/audit/log";

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
    case "SECRETARY":
    case "WELFARE_OFFICER":
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
 * Same visibility rule as getPlayerForMembership, factored out so any
 * data-access function needing "is this player in scope for this caller"
 * (e.g. stat totals) enforces it identically rather than re-deriving it.
 */
export function playerScopeWhere(active: Membership, playerId: string) {
  return active.role === "SECRETARY" || active.role === "WELFARE_OFFICER"
    ? { id: playerId, clubId: active.clubId }
    : active.role === "COACH"
      ? { id: playerId, teamId: active.teamId ?? "__none__" }
      : active.role === "GUARDIAN"
        ? { id: playerId, guardians: { some: { guardianUserId: active.userId } } }
        : { id: "__none__" }; // TREASURER and anything else: no access
}

/**
 * Fetch a single player, scoped to what this membership is allowed to see.
 * Returns null if the player doesn't exist *or* is out of scope — the
 * caller can't tell those apart, which is the point.
 */
export async function getPlayerForMembership(active: Membership, playerId: string) {
  // A guardian always sees their own child's medical record. Everyone else
  // needs medical:view — which the secretary and treasurer deliberately
  // lack, per the safeguarding page's published role table.
  const canSeeMedical =
    active.role === "GUARDIAN" || roleHasCapability(active.role, "medical:view");

  const player = await prisma.player.findFirst({
    where: playerScopeWhere(active, playerId),
    include: {
      medical: canSeeMedical,
      guardians: { include: { guardian: { select: { id: true, name: true, email: true } } } },
      team: true,
    },
  });

  // Safeguarding page promise: "every view of a medical or safeguarding
  // record" — logged for staff (coach/welfare officer) actually receiving
  // medical data. A guardian's routine view of their own child isn't
  // logged here, or this would flood the log with low-value entries.
  if (player?.medical && active.role !== "GUARDIAN") {
    await writeAuditLog({
      actorUserId: active.userId,
      action: "medical.viewed",
      entityType: "PlayerMedicalInfo",
      entityId: player.id,
    });
  }

  return player;
}

/**
 * A headcount only — no names, no medical/consent data — so it's safe for
 * any internal role to show on the dashboard, including the treasurer, who
 * otherwise has no player:view:* capability at all.
 */
export async function countActivePlayersForClub(active: Membership) {
  return prisma.player.count({ where: { clubId: active.clubId, status: "ACTIVE" } });
}

/**
 * Club guardians not yet linked to this player — the candidate list when a
 * secretary links someone new. Restricted to people who already hold a
 * GUARDIAN role at this club, so linking can never reach an arbitrary
 * account.
 */
export async function listLinkableGuardians(active: Membership, playerId: string) {
  if (active.role !== "SECRETARY") return [];

  const memberships = await prisma.membership.findMany({
    where: {
      clubId: active.clubId,
      role: "GUARDIAN",
      status: "ACTIVE",
      user: { guardianOf: { none: { playerId } } },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return memberships.map((membership) => membership.user);
}
