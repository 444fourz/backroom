import { NextResponse } from "next/server";

import { mobileRoute } from "@/lib/auth/mobile";
import { listGuardianChildren } from "@/lib/data/mobile";

export const GET = mobileRoute(async (_req, user) => {
  const children = await listGuardianChildren(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    children: children.map((child) => ({
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      team: { id: child.team.id, name: child.team.name },
      club: { id: child.team.club.id, name: child.team.club.name },
    })),
  });
});
