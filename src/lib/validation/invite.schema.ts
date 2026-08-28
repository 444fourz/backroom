import { z } from "zod";

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().min(2, "Enter your name").max(120),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
