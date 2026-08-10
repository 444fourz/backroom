"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
});

export async function updateProfileAction(formData: FormData) {
  const user = await requireCurrentUser();

  const parsed = updateProfileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/settings/profile");
}
