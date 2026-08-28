import { z } from "zod";

export const emergencyContactSchema = z.object({
  playerId: z.string().min(1),
  emergencyContactName: z.string().min(2, "Enter a name"),
  emergencyContactPhone: z.string().min(5, "Enter a phone number"),
});

export const medicalInfoSchema = z.object({
  playerId: z.string().min(1),
  allergies: z.string().max(500).optional().or(z.literal("")),
  conditions: z.string().max(500).optional().or(z.literal("")),
});
