import { z } from "zod";

export const createEventSchema = z.object({
  type: z.enum(["MATCH", "TRAINING", "TOURNAMENT", "SOCIAL"]),
  title: z.string().min(2, "Give the fixture a title").max(120),
  opponent: z.string().max(120).optional().or(z.literal("")),
  venueName: z.string().min(2, "Venue is required").max(160),
  venueAddress: z.string().max(240).optional().or(z.literal("")),
  meetTime: z.string().optional().or(z.literal("")),
  startTime: z.string().min(1, "Start time is required"),
  kitColour: z.string().max(60).optional().or(z.literal("")),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const availabilityResponseSchema = z.object({
  eventId: z.string().min(1),
  playerId: z.string().min(1),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
});

export const attendanceRecordSchema = z.object({
  eventId: z.string().min(1),
  playerId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
});
