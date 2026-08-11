"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { changePasswordSchema } from "@/lib/validation/auth.schema";
import { writeAuditLog } from "@/lib/audit/log";

function fail(message: string): never {
  redirect(`/settings/account?error=${encodeURIComponent(message)}`);
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const user = await requireCurrentUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Check the details you entered.");
  }

  const isCurrentValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    fail("Your current password is incorrect.");
  }

  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "auth.password_changed",
    entityType: "User",
    entityId: user.id,
  });

  redirect("/settings/account?success=1");
}
