"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import {
  guardianLinkSchema,
  renamePlayerSchema,
  unlinkGuardianSchema,
  updatePlayerSchema,
} from "@/lib/validation/member.schema";

/**
 * Player administration for the secretary. Note what is NOT here: nothing
 * touches PlayerMedicalInfo. A secretary managing a player must not become
 * a side door into medical data they're promised not to see.
 */

function back(path: string, message: string, kind: "error" | "ok" = "error"): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

/** Confirms the player belongs to the caller's club, and returns them. */
async function requirePlayerInClub(clubId: string, playerId: string, returnTo: string) {
  const player = await prisma.player.findFirst({
    where: { id: playerId, clubId },
    select: { id: true, firstName: true, lastName: true, teamId: true, status: true },
  });
  if (!player) back(returnTo, "That player isn't in your club.");
  return player;
}

export async function renamePlayerAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");
  const parsed = renamePlayerSchema.safeParse({
    playerId: formData.get("playerId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  const returnTo = "/players";
  if (!parsed.success) back(returnTo, parsed.error.issues[0]?.message ?? "Check the name.");

  const player = await requirePlayerInClub(active.clubId, parsed.data.playerId, returnTo);

  await prisma.player.update({
    where: { id: player.id },
    data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
  });

  // Children's data — always logged, even for a spelling fix.
  await writeAuditLog({
    actorUserId: user.id,
    action: "player.renamed",
    entityType: "Player",
    entityId: player.id,
    metadata: {
      from: `${player.firstName} ${player.lastName}`,
      to: `${parsed.data.firstName} ${parsed.data.lastName}`,
    },
  });

  revalidatePath(returnTo);
  revalidatePath(`/players/${player.id}`);
  back(returnTo, "Player updated", "ok");
}

export async function updatePlayerAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");
  const parsed = updatePlayerSchema.safeParse({
    playerId: formData.get("playerId"),
    teamId: formData.get("teamId"),
    status: formData.get("status"),
  });
  const returnTo = "/players";
  if (!parsed.success) back(returnTo, parsed.error.issues[0]?.message ?? "Check the details.");

  const player = await requirePlayerInClub(active.clubId, parsed.data.playerId, returnTo);

  const team = await prisma.team.findFirst({
    where: { id: parsed.data.teamId, clubId: active.clubId },
  });
  if (!team) back(returnTo, "That team isn't part of your club.");

  await prisma.player.update({
    where: { id: player.id },
    data: { teamId: team.id, status: parsed.data.status },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "player.updated",
    entityType: "Player",
    entityId: player.id,
    metadata: {
      teamFrom: player.teamId,
      teamTo: team.id,
      statusFrom: player.status,
      statusTo: parsed.data.status,
    },
  });

  revalidatePath(returnTo);
  revalidatePath(`/players/${player.id}`);
  back(returnTo, "Player updated", "ok");
}

/** Link a guardian to a player — i.e. grant someone sight of that child. */
export async function linkGuardianAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");
  const parsed = guardianLinkSchema.safeParse({
    playerId: formData.get("playerId"),
    guardianUserId: formData.get("guardianUserId"),
    relationship: formData.get("relationship") ?? "",
  });
  const returnTo = `/players/${String(formData.get("playerId") ?? "")}`;
  if (!parsed.success) back("/players", "Check the details.");

  const player = await requirePlayerInClub(active.clubId, parsed.data.playerId, returnTo);

  // The prospective guardian must already be a member of this club — this
  // action grants sight of a child, so it can't reach arbitrary accounts.
  const guardianMembership = await prisma.membership.findFirst({
    where: { userId: parsed.data.guardianUserId, clubId: active.clubId, role: "GUARDIAN" },
  });
  if (!guardianMembership) back(returnTo, "That person isn't a guardian at this club.");

  const existing = await prisma.guardianPlayer.findFirst({
    where: { guardianUserId: parsed.data.guardianUserId, playerId: player.id },
  });
  if (existing) back(returnTo, "They're already linked to this player.");

  await prisma.guardianPlayer.create({
    data: {
      guardianUserId: parsed.data.guardianUserId,
      playerId: player.id,
      relationship: parsed.data.relationship?.trim() || "Parent",
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "guardian.linked",
    entityType: "Player",
    entityId: player.id,
    metadata: { guardianUserId: parsed.data.guardianUserId },
  });

  revalidatePath(returnTo);
  back(returnTo, "Guardian linked", "ok");
}

export async function unlinkGuardianAction(formData: FormData): Promise<void> {
  const { user, active } = await requireCapability("club:manage");
  const parsed = unlinkGuardianSchema.safeParse({
    playerId: formData.get("playerId"),
    guardianUserId: formData.get("guardianUserId"),
  });
  const returnTo = `/players/${String(formData.get("playerId") ?? "")}`;
  if (!parsed.success) back("/players", "Check the details.");

  const player = await requirePlayerInClub(active.clubId, parsed.data.playerId, returnTo);

  await prisma.guardianPlayer.deleteMany({
    where: { playerId: player.id, guardianUserId: parsed.data.guardianUserId },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "guardian.unlinked",
    entityType: "Player",
    entityId: player.id,
    metadata: { guardianUserId: parsed.data.guardianUserId },
  });

  revalidatePath(returnTo);
  back(returnTo, "Guardian unlinked", "ok");
}
