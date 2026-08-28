"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { addSponsorSchema } from "@/lib/validation/club.schema";

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

export async function addSponsorAction(formData: FormData) {
  const { user, active } = await requireCapability("club:manage");

  const parsed = addSponsorSchema.safeParse({
    name: formData.get("name"),
    websiteUrl: formData.get("websiteUrl"),
  });
  if (!parsed.success) return;

  const sponsor = await prisma.sponsor.create({
    data: {
      clubId: active.clubId,
      name: parsed.data.name,
      websiteUrl: parsed.data.websiteUrl || null,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "sponsor.added",
    entityType: "Sponsor",
    entityId: sponsor.id,
  });

  revalidatePath("/club");
}

export async function removeSponsorAction(formData: FormData) {
  const { user, active } = await requireCapability("club:manage");

  const sponsorId = formData.get("sponsorId");
  if (typeof sponsorId !== "string" || !sponsorId) return;

  // Re-derive scope — never trust the posted id alone.
  const sponsor = await prisma.sponsor.findFirst({ where: { id: sponsorId, clubId: active.clubId } });
  if (!sponsor) return;

  await prisma.sponsor.delete({ where: { id: sponsor.id } });

  await writeAuditLog({
    actorUserId: user.id,
    action: "sponsor.removed",
    entityType: "Sponsor",
    entityId: sponsor.id,
    metadata: { name: sponsor.name },
  });

  revalidatePath("/club");
}
