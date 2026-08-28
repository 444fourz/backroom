"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { acceptInviteSchema } from "@/lib/validation/invite.schema";

function fail(token: string, message: string): never {
  redirect(`/register-invite/${token}?error=${encodeURIComponent(message)}`);
}

/**
 * Creates the account for someone with no existing BackRoom login. If an
 * account for this email already exists, the invite is instead auto-accepted
 * the next time that person authenticates — see getActiveMembership() — so
 * this action only ever needs to handle the "brand new person" path.
 */
export async function acceptInviteAction(formData: FormData): Promise<void> {
  const rawToken = String(formData.get("token") ?? "");

  const parsed = acceptInviteSchema.safeParse({
    token: rawToken,
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) fail(rawToken, parsed.error.issues[0]?.message ?? "Check the details you entered.");

  const invite = await prisma.invite.findFirst({
    where: { token: parsed.data.token, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!invite) fail(parsed.data.token, "This invite link is no longer valid.");

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) fail(parsed.data.token, "An account already exists for this email. Log in instead.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: invite.email, name: parsed.data.name, passwordHash },
    });
    await tx.membership.create({
      data: {
        userId: created.id,
        clubId: invite.clubId,
        teamId: invite.teamId,
        role: invite.role,
        status: "ACTIVE",
      },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return created;
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "invite.accepted",
    entityType: "Invite",
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  redirect(`/login?registered=1&email=${encodeURIComponent(invite.email)}`);
}
