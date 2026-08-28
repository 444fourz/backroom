import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export const ACTIVE_MEMBERSHIP_COOKIE = "activeMembershipId";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Auto-accepts any pending invite addressed to this user's email. This is
 * what closes the loop for someone who already has a BackRoom account and
 * gets invited to a second club (or a second role) — they never see an
 * "accept" step, the membership is just there next time they're signed in.
 * A brand-new person instead creates their account via the
 * /register-invite/[token] form, which marks the invite accepted directly.
 */
async function attachPendingInvites(userId: string, email: string) {
  const pending = await prisma.invite.findMany({
    where: { email: email.toLowerCase().trim(), acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending.length === 0) return;

  for (const invite of pending) {
    const alreadyMember = await prisma.membership.findFirst({
      where: { userId, clubId: invite.clubId, role: invite.role, teamId: invite.teamId },
    });
    if (!alreadyMember) {
      await prisma.membership.create({
        data: { userId, clubId: invite.clubId, teamId: invite.teamId, role: invite.role, status: "ACTIVE" },
      });
    }
    await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  }
}

/**
 * Resolves which club/team the current request is acting within. A user can
 * hold memberships at multiple clubs (and multiple roles/teams within one
 * club), so identity alone never implies a scope — every capability check
 * downstream is evaluated against this "active membership", never against
 * the whole membership list.
 */
export async function getActiveMembership() {
  const user = await requireCurrentUser();
  await attachPendingInvites(user.id, user.email);

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { club: true, team: true },
    orderBy: { createdAt: "asc" },
  });

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_MEMBERSHIP_COOKIE)?.value;

  const active =
    memberships.find((m) => m.id === activeId) ??
    (memberships.length === 1 ? memberships[0] : null);

  return { user, memberships, active };
}

export async function requireActiveMembership() {
  const { user, memberships, active } = await getActiveMembership();

  if (memberships.length === 0) {
    // No club membership at all — nothing to scope into. Not a route in the
    // v1 inventory; surface it inline rather than adding a dedicated page.
    redirect("/unauthorized");
  }

  if (!active) {
    redirect("/select-club");
  }

  return { user, memberships, active };
}
