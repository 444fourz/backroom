import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/** All of these are SECRETARY-only (guarded via `club:manage` at the page level); they always scope to the caller's own club. */

export async function getClubOverview(active: Membership) {
  return prisma.club.findUnique({
    where: { id: active.clubId },
    include: {
      teams: { include: { _count: { select: { players: true } } } },
      seasons: { orderBy: { startDate: "desc" } },
      _count: { select: { memberships: true, players: true, documents: true } },
    },
  });
}

export async function listTeamsForClub(active: Membership) {
  return prisma.team.findMany({
    where: { clubId: active.clubId },
    include: { _count: { select: { players: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getTeamForClub(active: Membership, teamId: string) {
  return prisma.team.findFirst({
    where: { id: teamId, clubId: active.clubId },
    include: {
      players: { orderBy: { lastName: "asc" } },
      memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
}

export async function listMembersForClub(active: Membership) {
  return prisma.membership.findMany({
    where: { clubId: active.clubId },
    include: { user: { select: { id: true, name: true, email: true } }, team: true },
    orderBy: [{ role: "asc" }],
  });
}

/**
 * Scoped by each document's own `visibility` list, not just the caller's
 * capability — a secretary reaches this via document:manage, but that alone
 * would show every document including a coach's DBS certificate. The
 * safeguarding page promises the secretary sees a DBS is in date, never the
 * certificate itself; the certificate's visibility is WELFARE_OFFICER-only,
 * so it's filtered out here rather than relying on the route guard alone.
 */
export async function listDocumentsForClub(active: Membership) {
  return prisma.document.findMany({
    where: { clubId: active.clubId, visibility: { has: active.role } },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listSeasonsForClub(active: Membership) {
  return prisma.season.findMany({
    where: { clubId: active.clubId },
    orderBy: { startDate: "desc" },
  });
}
