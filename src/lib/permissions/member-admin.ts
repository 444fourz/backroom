import type { Membership, MembershipRole } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { roleLabel } from "./policies";

/**
 * Guardrails on member/role administration.
 *
 * The secretary administers people, but is deliberately NOT a superuser —
 * they cannot see medical notes, safeguarding certificates or finances.
 * That separation is only real if they also can't hand themselves the role
 * that would reveal it, so the central rule here is:
 *
 *   A secretary may grant any role to ANYONE ELSE, but may never change
 *   their own role, nor invite themselves into one they don't already hold.
 *
 * Without that, "no role in the club can grant it" — which the marketing
 * site tells welfare officers — would be false, and the whole role split
 * would be decorative.
 */

export type AdminCheck = { ok: true } | { ok: false; reason: string };

const OK: AdminCheck = { ok: true };

/** Only the secretary administers membership. */
export function canAdministerMembers(active: Membership): boolean {
  return active.role === "SECRETARY";
}

/**
 * Can `active` change the role on `targetMembership` to `nextRole`?
 * Everything here is re-checked server-side in the action; this function is
 * the single place the rules are written down.
 */
export async function checkRoleChange(
  active: Membership,
  targetMembership: Pick<Membership, "id" | "userId" | "clubId" | "role">,
  nextRole: MembershipRole,
): Promise<AdminCheck> {
  if (!canAdministerMembers(active)) {
    return { ok: false, reason: "Only the secretary can change roles." };
  }
  if (targetMembership.clubId !== active.clubId) {
    return { ok: false, reason: "That person isn't in your club." };
  }

  // The self-escalation rule. Blocking ALL self role-changes (not just
  // upgrades) keeps it simple and unambiguous: your own role is never
  // something you edit, so there's no path to granting yourself medical
  // or financial visibility.
  if (targetMembership.userId === active.userId) {
    return {
      ok: false,
      reason:
        "You can't change your own role. Ask another secretary to do it, so nobody can grant themselves access to medical or financial records.",
    };
  }

  // Don't let the club lose its last secretary — that would leave nobody
  // able to administer members at all.
  if (targetMembership.role === "SECRETARY" && nextRole !== "SECRETARY") {
    const secretaries = await prisma.membership.count({
      where: { clubId: active.clubId, role: "SECRETARY", status: "ACTIVE" },
    });
    if (secretaries <= 1) {
      return {
        ok: false,
        reason: "This is the club's only secretary. Appoint another one first.",
      };
    }
  }

  return OK;
}

/** Can `active` revoke `targetMembership` entirely? */
export async function checkRemoveMembership(
  active: Membership,
  targetMembership: Pick<Membership, "id" | "userId" | "clubId" | "role">,
): Promise<AdminCheck> {
  if (!canAdministerMembers(active)) {
    return { ok: false, reason: "Only the secretary can remove access." };
  }
  if (targetMembership.clubId !== active.clubId) {
    return { ok: false, reason: "That person isn't in your club." };
  }
  if (targetMembership.userId === active.userId) {
    return { ok: false, reason: "You can't remove your own access." };
  }
  if (targetMembership.role === "SECRETARY") {
    const secretaries = await prisma.membership.count({
      where: { clubId: active.clubId, role: "SECRETARY", status: "ACTIVE" },
    });
    if (secretaries <= 1) {
      return {
        ok: false,
        reason: "This is the club's only secretary. Appoint another one first.",
      };
    }
  }
  return OK;
}

/**
 * Can `active` invite `email` as `role`?
 *
 * Self-inviting into a role is allowed only when nobody currently holds it
 * — that's the one-person-club case: a solo secretary can add Treasurer to
 * their own account if the club has no dedicated treasurer yet, so they
 * aren't blocked from doing the job themselves. The moment someone else
 * actually holds a role, self-inviting into it is blocked — a secretary
 * can't sidestep an existing treasurer or welfare officer's exclusive
 * access to something they're not meant to see just by also granting it
 * to themselves. Clubs with real committees still get the full separation.
 */
export async function checkInvite(
  active: Membership,
  actorEmail: string,
  email: string,
  role: MembershipRole,
): Promise<AdminCheck> {
  if (!canAdministerMembers(active)) {
    return { ok: false, reason: "Only the secretary can invite people." };
  }

  const normalised = email.toLowerCase().trim();
  const isSelfInvite = normalised === actorEmail.toLowerCase().trim();

  if (isSelfInvite && role !== active.role) {
    const holder = await prisma.membership.findFirst({
      where: { clubId: active.clubId, role, status: "ACTIVE" },
    });
    if (holder) {
      return {
        ok: false,
        reason: `Someone already holds the ${roleLabel(role).toLowerCase()} role at this club. Ask them, or remove their access first.`,
      };
    }
  }

  const existing = await prisma.membership.findFirst({
    where: { clubId: active.clubId, user: { email: normalised }, role },
  });
  if (existing) {
    return { ok: false, reason: "They already hold that role at this club." };
  }

  return OK;
}
