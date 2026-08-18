import { z } from "zod";

const ROLES = ["SECRETARY", "WELFARE_OFFICER", "TREASURER", "COACH", "GUARDIAN"] as const;

export const roleChangeSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(ROLES),
  // Empty string means "no specific team" (club-wide role).
  teamId: z.string().optional(),
});

export const removeMembershipSchema = z.object({
  membershipId: z.string().min(1),
});

export const renameUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, "Name is too short").max(120),
});

export const renamePlayerSchema = z.object({
  playerId: z.string().min(1),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  teamId: z.string().min(1, "Choose a team"),
  status: z.enum(["ACTIVE", "LEFT"]),
});

export const guardianLinkSchema = z.object({
  playerId: z.string().min(1),
  guardianUserId: z.string().min(1),
  relationship: z.string().trim().max(60).optional(),
});

export const unlinkGuardianSchema = z.object({
  playerId: z.string().min(1),
  guardianUserId: z.string().min(1),
});

export const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(ROLES),
  teamId: z.string().optional(),
});
