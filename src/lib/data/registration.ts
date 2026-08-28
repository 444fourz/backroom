import type { Membership } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * Registration and consent records are visible club-wide to the SECRETARY
 * (who runs registration) and the WELFARE_OFFICER (who owns consent), and
 * to a GUARDIAN for their own children. Deliberately NOT the coach — the
 * safeguarding page promises a coach does not see "consent paperwork" —
 * and not the treasurer.
 */
export async function listRegistrationsForMembership(active: Membership) {
  if (active.role === "SECRETARY" || active.role === "WELFARE_OFFICER") {
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
    const children = await prisma.player.findMany({
      where: { guardians: { some: { guardianUserId: active.userId } }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, teamId: true },
    });

    const registrations = await prisma.registrationForm.findMany({
      where: { playerId: { in: children.map((child) => child.id) } },
      include: {
        player: { select: { id: true, firstName: true, lastName: true, teamId: true } },
        season: { select: { id: true, label: true } },
      },
      orderBy: [{ status: "asc" }],
    });

    // A player with no RegistrationForm row yet (new to the club, or the
    // season just started) would otherwise vanish from this list entirely
    // — synthesize a NOT_STARTED placeholder for the active season so
    // there's always a way in to actually start registering.
    const activeSeason = await prisma.season.findFirst({ where: { clubId: active.clubId, isActive: true } });
    const covered = new Set(
      registrations.filter((registration) => registration.season.id === activeSeason?.id).map((r) => r.playerId),
    );
    const notStarted = activeSeason
      ? children
          .filter((child) => !covered.has(child.id))
          .map((child) => ({
            id: `not-started:${child.id}`,
            playerId: child.id,
            seasonId: activeSeason.id,
            status: "NOT_STARTED" as const,
            submittedAt: null,
            dataJson: null,
            player: child,
            season: { id: activeSeason.id, label: activeSeason.label },
          }))
      : [];

    return [...notStarted, ...registrations];
  }

  return [];
}

const REQUIRED_CONSENT_TYPES = ["PHOTO", "MEDICAL_TREATMENT", "TRAVEL", "CODE_OF_CONDUCT"] as const;

/**
 * Everything the registration wizard needs for one of the guardian's own
 * children, in the club's current active season. Returns null if the
 * player isn't theirs or there's no active season to register into — the
 * wizard has nothing meaningful to show either way.
 */
export async function getRegistrationWizardData(active: Membership, playerId: string) {
  if (active.role !== "GUARDIAN") return null;

  const player = await prisma.player.findFirst({
    where: { id: playerId, guardians: { some: { guardianUserId: active.userId } } },
    include: { medical: true, team: true },
  });
  if (!player) return null;

  const season = await prisma.season.findFirst({ where: { clubId: active.clubId, isActive: true } });
  if (!season) return null;

  const [registrationForm, consents, lastGrantedConsents, invoice] = await Promise.all([
    prisma.registrationForm.findUnique({ where: { playerId_seasonId: { playerId, seasonId: season.id } } }),
    prisma.consent.findMany({ where: { playerId, seasonId: season.id } }),
    prisma.consent.findMany({
      where: { playerId, granted: true, season: { clubId: active.clubId, id: { not: season.id } } },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.invoice.findFirst({ where: { playerId, seasonId: season.id, type: "SUBS" } }),
  ]);

  const grantedThisSeason = new Set(consents.filter((consent) => consent.granted).map((consent) => consent.type));
  const grantedLastSeason = new Set(lastGrantedConsents.map((consent) => consent.type));

  return {
    player,
    season,
    registrationForm,
    invoice,
    consentStatus: REQUIRED_CONSENT_TYPES.map((type) => ({
      type,
      granted: grantedThisSeason.has(type),
      // Pre-check the box with last season's answer as a starting point —
      // still requires an explicit re-submit for this season, consent
      // doesn't silently carry forward.
      previouslyGranted: grantedLastSeason.has(type),
    })),
  };
}

export async function getPlayerRegistrationForMembership(active: Membership, playerId: string) {
  const canAccess =
    active.role === "SECRETARY" || active.role === "WELFARE_OFFICER"
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
