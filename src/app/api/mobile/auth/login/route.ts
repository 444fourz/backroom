import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { signMobileToken } from "@/lib/auth/mobile";
import { writeAuditLog } from "@/lib/audit/log";
import { loginSchema } from "@/lib/validation/auth.schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the details you entered." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
  const isValid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !isValid) {
    return NextResponse.json(
      { error: "That email and password combination doesn't match our records." },
      { status: 401 },
    );
  }

  const isGuardian = await prisma.membership.findFirst({
    where: { userId: user.id, role: "GUARDIAN", status: "ACTIVE" },
  });
  if (!isGuardian) {
    return NextResponse.json({ error: "Mobile access is available to guardians only, for now." }, { status: 403 });
  }

  const token = await signMobileToken(user.id);

  await writeAuditLog({
    actorUserId: user.id,
    action: "auth.mobile_login",
    entityType: "User",
    entityId: user.id,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
