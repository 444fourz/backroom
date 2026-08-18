import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { playerScopeWhere } from "@/lib/data/players";

/**
 * Career totals for one player, scoped the same way as getPlayerForMembership
 * — returns null if the player is out of the caller's scope rather than
 * leaking totals for a player they can't otherwise see.
 */
export async function getPlayerStatTotals(active: Membership, playerId: string) {
  const player = await prisma.player.findFirst({
    where: playerScopeWhere(active, playerId),
    select: { id: true },
  });
  if (!player) return null;

  const [totals, appearances] = await Promise.all([
    prisma.matchStat.aggregate({
      where: { playerId },
      _sum: { goals: true, assists: true },
    }),
    prisma.matchStat.count({ where: { playerId } }),
  ]);

  return {
    goals: totals._sum.goals ?? 0,
    assists: totals._sum.assists ?? 0,
    appearances,
  };
}

/**
 * Club-wide top scorers/assisters. A coach only ever sees their own team's
 * players in the first place (player:view:team is team-scoped for a coach),
 * so this reuses the same team constraint rather than a separate check.
 */
export async function listStatsLeaderboard(active: Membership) {
  const teamWhere =
    active.role === "COACH" ? { teamId: active.teamId ?? "__none__" } : { clubId: active.clubId };

  const players = await prisma.player.findMany({
    where: { status: "ACTIVE", ...teamWhere },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      team: { select: { name: true } },
      matchStats: { select: { goals: true, assists: true } },
    },
  });

  return players
    .map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      teamName: player.team.name,
      goals: player.matchStats.reduce((sum, stat) => sum + stat.goals, 0),
      assists: player.matchStats.reduce((sum, stat) => sum + stat.assists, 0),
      appearances: player.matchStats.length,
    }))
    .filter((row) => row.appearances > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}
