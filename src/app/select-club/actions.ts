"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireCurrentUser, ACTIVE_MEMBERSHIP_COOKIE } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function selectMembershipAction(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  const user = await requireCurrentUser();

  // Re-check ownership server-side — never trust the posted id alone.
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, userId: user.id, status: "ACTIVE" },
  });
  if (!membership) redirect("/select-club");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_MEMBERSHIP_COOKIE, membership.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}
