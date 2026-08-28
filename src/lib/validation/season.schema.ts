import { z } from "zod";

export const rolloverSeasonSchema = z
  .object({
    label: z.string().min(2, "Give the season a label").max(40),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });
