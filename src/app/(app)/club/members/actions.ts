"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/permissions/guard";
import {
  checkInvite,
  checkRemoveMembership,
  checkRoleChange,
} from "@/lib/permissions/member-admin";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import {
  inviteSchema,
  removeMembershipSchema,
  renameUserSchema,
  roleChangeSchema,
} from "@/lib/validation/member.schema";

function back(path: string, message: string, kind: "error" | "ok" = "error"): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

const MEMBERS = "/club/members";

/** Change someone's role (and team scope). Never your own — see member-admin.ts. */
export async function changeRoleAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");

  const parsed = roleChangeSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    teamId: formData.get("teamId") ?? "",
  });
  if (!parsed.success) back(MEMBERS, parsed.error.issues[0]?.message ?? "Check the details.");

  const target = await prisma.membership.findUnique({ where: { id: parsed.data.membershipId } });
  if (!target) back(MEMBERS, "That membership no longer exists.");

  const verdict = await checkRoleChange(active, target, parsed.data.role);
  if (!verdict.ok) back(MEMBERS, verdict.reason);

  // A team-scoped role must name a team in this club; a club-wide role clears it.
  const wantsTeam = parsed.data.role === "COACH";
  let teamId: string | null = null;
  if (wantsTeam) {
    const candidate = parsed.data.teamId?.trim();
    if (!candidate) back(MEMBERS, "A coach needs a team.");
    const team = await prisma.team.findFirst({
      where: { id: candidate, clubId: active.clubId },
    });
    if (!team) back(MEMBERS, "That team isn't part of your club.");
    teamId = team.id;
  }

  const duplicate = await prisma.membership.findFirst({
    where: {
      userId: target.userId,
      clubId: active.clubId,
      role: parsed.data.role,
      teamId,
      id: { not: target.id },
    },
  });
  if (duplicate) back(MEMBERS, "They already hold that role.");

  await prisma.membership.update({
    where: { id: target.id },
    data: { role: parsed.data.role, teamId },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "membership.role_changed",
    entityType: "Membership",
    entityId: target.id,
    metadata: { from: target.role, to: parsed.data.role, teamId, subjectUserId: target.userId },
  });

  revalidatePath(MEMBERS);
  back(MEMBERS, "Role updated", "ok");
}

export async function removeMembershipAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");

  const parsed = removeMembershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) back(MEMBERS, "Check the details.");

  const target = await prisma.membership.findUnique({ where: { id: parsed.data.membershipId } });
  if (!target) back(MEMBERS, "That membership no longer exists.");

  const verdict = await checkRemoveMembership(active, target);
  if (!verdict.ok) back(MEMBERS, verdict.reason);

  await prisma.membership.delete({ where: { id: target.id } });

  await writeAuditLog({
    actorUserId: user.id,
    action: "membership.removed",
    entityType: "Membership",
    entityId: target.id,
    metadata: { role: target.role, subjectUserId: target.userId },
  });

  revalidatePath(MEMBERS);
  back(MEMBERS, "Access removed", "ok");
}

/** Correct someone's name. Scoped to people who are actually in this club. */
export async function renameUserAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");

  const parsed = renameUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
  });
  if (!parsed.success) back(MEMBERS, parsed.error.issues[0]?.message ?? "Check the name.");

  const inClub = await prisma.membership.findFirst({
    where: { userId: parsed.data.userId, clubId: active.clubId },
  });
  if (!inClub) back(MEMBERS, "That person isn't in your club.");

  const before = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { name: true },
  });

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { name: parsed.data.name },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "user.renamed",
    entityType: "User",
    entityId: parsed.data.userId,
    metadata: { from: before?.name, to: parsed.data.name },
  });

  revalidatePath(MEMBERS);
  back(MEMBERS, "Name updated", "ok");
}

/**
 * Create an invitation. No email is sent — there's no provider wired up yet —
 * so the secretary copies the link from the members page. The Invite row is
 * the real artefact; adding delivery later doesn't change this action.
 */
export async function createInviteAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    teamId: formData.get("teamId") ?? "",
  });
  if (!parsed.success) back(MEMBERS, parsed.error.issues[0]?.message ?? "Check the details.");

  const verdict = await checkInvite(active, user.email, parsed.data.email, parsed.data.role);
  if (!verdict.ok) back(MEMBERS, verdict.reason);

  let teamId: string | null = null;
  if (parsed.data.role === "COACH") {
    const candidate = parsed.data.teamId?.trim();
    if (!candidate) back(MEMBERS, "A coach needs a team.");
    const team = await prisma.team.findFirst({ where: { id: candidate, clubId: active.clubId } });
    if (!team) back(MEMBERS, "That team isn't part of your club.");
    teamId = team.id;
  }

  const invite = await prisma.invite.create({
    data: {
      clubId: active.clubId,
      email: parsed.data.email.toLowerCase().trim(),
      role: parsed.data.role,
      teamId,
      token: randomBytes(24).toString("base64url"),
      invitedByUserId: user.id,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "invite.created",
    entityType: "Invite",
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  revalidatePath(MEMBERS);
  back(MEMBERS, "Invite created — copy the link to send it", "ok");
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");
  const id = String(formData.get("inviteId") ?? "");

  const invite = await prisma.invite.findFirst({ where: { id, clubId: active.clubId } });
  if (!invite) back(MEMBERS, "That invite no longer exists.");

  await prisma.invite.delete({ where: { id: invite.id } });
  await writeAuditLog({
    actorUserId: user.id,
    action: "invite.revoked",
    entityType: "Invite",
    entityId: invite.id,
    metadata: { email: invite.email },
  });

  revalidatePath(MEMBERS);
  back(MEMBERS, "Invite revoked", "ok");
}
