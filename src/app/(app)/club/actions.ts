"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { addSponsorSchema } from "@/lib/validation/club.schema";
import { rolloverSeasonSchema } from "@/lib/validation/season.schema";

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

export async function rolloverSeasonAction(formData: FormData) {
  const { user, active } = await requireCapability("club:manage");

  const parsed = rolloverSeasonSchema.safeParse({
    label: formData.get("label"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return;

  const existing = await prisma.season.findUnique({
    where: { clubId_label: { clubId: active.clubId, label: parsed.data.label } },
  });
  if (existing) return;

  // Teams and players aren't season-scoped, so they carry forward as-is —
  // rollover just closes the old season and opens the new one. Invoices,
  // registration forms and consents are seasonId-scoped, so they naturally
  // start fresh for the new season without any copying.
  const season = await prisma.$transaction(async (tx) => {
    await tx.season.updateMany({
      where: { clubId: active.clubId, isActive: true },
      data: { isActive: false },
    });
    return tx.season.create({
      data: {
        clubId: active.clubId,
        label: parsed.data.label,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        isActive: true,
      },
    });
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "season.rolledOver",
    entityType: "Season",
    entityId: season.id,
    metadata: { label: season.label },
  });

  revalidatePath("/club");
  revalidatePath("/club/seasons");
  revalidatePath("/dashboard");
  revalidatePath("/registration");
}
