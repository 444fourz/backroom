import { z } from "zod";

const VISIBLE_CATEGORIES = ["POLICY", "CONSENT_FORM", "OTHER"] as const;

export const addDocumentSchema = z.object({
  title: z.string().min(2, "Give the document a title").max(120),
  category: z.enum(VISIBLE_CATEGORIES),
  fileUrl: z
    .string()
    .trim()
    .refine((value) => /^https?:\/\/.+/i.test(value), "Include https:// — this is a link, not a file upload"),
  visibility: z.array(z.enum(["WELFARE_OFFICER", "TREASURER", "COACH", "GUARDIAN"])),
});
