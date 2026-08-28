import { z } from "zod";

export const addSponsorSchema = z.object({
  name: z.string().min(2, "Give the sponsor a name").max(120),
  websiteUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), "Include https:// or leave it blank")
    .optional()
    .or(z.literal("")),
});
