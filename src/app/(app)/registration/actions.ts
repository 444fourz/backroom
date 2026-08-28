"use server";

import { revalidatePath } from "next/cache";
import type { Membership, RegistrationStatus } from "@prisma/client";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { emergencyContactSchema, medicalInfoSchema } from "@/lib/validation/registration.schema";
import { writeAuditLog } from "@/lib/audit/log";

const REQUIRED_CONSENT_TYPES = ["PHOTO", "MEDICAL_TREATMENT", "TRAVEL", "CODE_OF_CONDUCT"] as const;
const CONSENT_POLICY_VERSION = "2026-1";

/**
 * Every action below re-derives this instead of trusting the posted
 * playerId alone: the player must be one of this guardian's own children,
 * and there must be an active season to register into.
 */
async function requireOwnPlayerInActiveSeason(active: Membership, playerId: string) {
  const player = await prisma.player.findFirst({
    where: { id: playerId, clubId: active.clubId, guardians: { some: { guardianUserId: active.userId } } },
  });
  if (!player) return null;

  const season = await prisma.season.findFirst({ where: { clubId: active.clubId, isActive: true } });
  if (!season) return null;

  return { player, season };
}

/** Moves a registration to IN_PROGRESS on first save, but never backs a COMPLETE one out. */
function nextStatus(current: RegistrationStatus | undefined): RegistrationStatus {
  return current === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
}

export async function updateEmergencyContactAction(formData: FormData) {
  const { user, active } = await requireCapability("registration:manage:own");

  const parsed = emergencyContactSchema.safeParse({
    playerId: formData.get("playerId"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
  });
  if (!parsed.success) return;

  const scope = await requireOwnPlayerInActiveSeason(active, parsed.data.playerId);
  if (!scope) return;

  await prisma.playerMedicalInfo.upsert({
    where: { playerId: parsed.data.playerId },
    update: {
      emergencyContactName: parsed.data.emergencyContactName,
      emergencyContactPhone: parsed.data.emergencyContactPhone,
    },
    create: {
      playerId: parsed.data.playerId,
      emergencyContactName: parsed.data.emergencyContactName,
      emergencyContactPhone: parsed.data.emergencyContactPhone,
    },
  });

  const existingForm = await prisma.registrationForm.findUnique({
    where: { playerId_seasonId: { playerId: parsed.data.playerId, seasonId: scope.season.id } },
  });
  await prisma.registrationForm.upsert({
    where: { playerId_seasonId: { playerId: parsed.data.playerId, seasonId: scope.season.id } },
    update: { status: nextStatus(existingForm?.status) },
    create: { playerId: parsed.data.playerId, seasonId: scope.season.id, status: "IN_PROGRESS" },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "registration.contact.updated",
    entityType: "Player",
    entityId: parsed.data.playerId,
  });

  revalidatePath(`/registration/${parsed.data.playerId}`);
  revalidatePath("/registration");
}

export async function updateMedicalInfoAction(formData: FormData) {
  const { user, active } = await requireCapability("registration:manage:own");

  const parsed = medicalInfoSchema.safeParse({
    playerId: formData.get("playerId"),
    allergies: formData.get("allergies"),
    conditions: formData.get("conditions"),
  });
  if (!parsed.success) return;

  const scope = await requireOwnPlayerInActiveSeason(active, parsed.data.playerId);
  if (!scope) return;

  // Emergency contact fields are required on this record — the "Medical &
  // allergies" step only makes sense once "Emergency contacts" has been
  // saved at least once, so there's no placeholder to invent here.
  const existingMedical = await prisma.playerMedicalInfo.findUnique({
    where: { playerId: parsed.data.playerId },
  });
  if (!existingMedical) return;

  await prisma.playerMedicalInfo.update({
    where: { playerId: parsed.data.playerId },
    data: {
      allergies: parsed.data.allergies || null,
      conditions: parsed.data.conditions || null,
    },
  });

  const existingForm = await prisma.registrationForm.findUnique({
    where: { playerId_seasonId: { playerId: parsed.data.playerId, seasonId: scope.season.id } },
  });
  await prisma.registrationForm.upsert({
    where: { playerId_seasonId: { playerId: parsed.data.playerId, seasonId: scope.season.id } },
    update: { status: nextStatus(existingForm?.status), dataJson: { medicalConfirmed: true } },
    create: {
      playerId: parsed.data.playerId,
      seasonId: scope.season.id,
      status: "IN_PROGRESS",
      dataJson: { medicalConfirmed: true },
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "registration.medical.updated",
    entityType: "Player",
    entityId: parsed.data.playerId,
  });

  revalidatePath(`/registration/${parsed.data.playerId}`);
  revalidatePath("/registration");
}

export async function updateConsentsAction(formData: FormData) {
  const { user, active } = await requireCapability("registration:manage:own");

  const playerId = formData.get("playerId");
  if (typeof playerId !== "string" || !playerId) return;

  const scope = await requireOwnPlayerInActiveSeason(active, playerId);
  if (!scope) return;

  for (const type of REQUIRED_CONSENT_TYPES) {
    const granted = formData.get(type) === "on";
    await prisma.consent.upsert({
      where: { playerId_seasonId_type: { playerId, seasonId: scope.season.id, type } },
      update: { granted, grantedByUserId: user.id, grantedAt: new Date(), policyVersion: CONSENT_POLICY_VERSION },
      create: {
        playerId,
        seasonId: scope.season.id,
        type,
        granted,
        grantedByUserId: user.id,
        policyVersion: CONSENT_POLICY_VERSION,
      },
    });
  }

  const existingForm = await prisma.registrationForm.findUnique({
    where: { playerId_seasonId: { playerId, seasonId: scope.season.id } },
  });
  await prisma.registrationForm.upsert({
    where: { playerId_seasonId: { playerId, seasonId: scope.season.id } },
    update: { status: nextStatus(existingForm?.status) },
    create: { playerId, seasonId: scope.season.id, status: "IN_PROGRESS" },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "registration.consent.updated",
    entityType: "Player",
    entityId: playerId,
  });

  revalidatePath(`/registration/${playerId}`);
  revalidatePath("/registration");
}

export async function submitRegistrationAction(formData: FormData) {
  const { user, active } = await requireCapability("registration:manage:own");

  const playerId = formData.get("playerId");
  if (typeof playerId !== "string" || !playerId) return;

  const scope = await requireOwnPlayerInActiveSeason(active, playerId);
  if (!scope) return;

  await prisma.registrationForm.upsert({
    where: { playerId_seasonId: { playerId, seasonId: scope.season.id } },
    update: { status: "COMPLETE", submittedAt: new Date() },
    create: { playerId, seasonId: scope.season.id, status: "COMPLETE", submittedAt: new Date() },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "registration.submitted",
    entityType: "RegistrationForm",
    entityId: playerId,
    metadata: { seasonId: scope.season.id },
  });

  revalidatePath(`/registration/${playerId}`);
  revalidatePath("/registration");
  revalidatePath("/dashboard");
}
