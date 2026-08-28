"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";

export async function updateArrearsSignalAction(formData: FormData) {
  const { user, active } = await requireCapability("club:manage");

  const enabled = formData.get("enabled") === "true";

  await prisma.club.update({
    where: { id: active.clubId },
    data: { showArrearsToWelfare: enabled },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "club.arrearsSignal.updated",
    entityType: "Club",
    entityId: active.clubId,
    metadata: { enabled },
  });

  revalidatePath("/club");
  revalidatePath("/players");
  revalidatePath("/dashboard");
}
