import { NextResponse, type NextRequest } from "next/server";
import { encode, decode } from "next-auth/jwt";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * A distinct salt keeps mobile API tokens cryptographically separate from
 * the web session cookie NextAuth issues from the same NEXTAUTH_SECRET — a
 * leaked mobile token can't be replayed as a web session cookie, or vice
 * versa, even though both are derived from the same underlying secret.
 */
const SALT = "clubcore-mobile-token";
// No refresh-token flow yet — a single 30-day token, no server-side
// revocation before it expires. Fine for a first cut with no real users;
// worth revisiting (short-lived access token + refresh token) before this
// ships to an actual app store.
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is not set");
  return value;
}

export async function signMobileToken(userId: string): Promise<string> {
  return encode({ token: { sub: userId, purpose: "mobile" }, secret: secret(), salt: SALT, maxAge: MAX_AGE });
}

async function verifyMobileToken(token: string): Promise<string | null> {
  try {
    const payload = await decode({ token, secret: secret(), salt: SALT });
    if (!payload?.sub || payload.purpose !== "mobile") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export class MobileAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolves the caller from the `Authorization: Bearer` header and confirms
 * they currently hold an active GUARDIAN membership somewhere. The mobile
 * API is guardian-only in this phase — see the clubcore-mobile plan — so
 * this doubles as both authentication and the phase-1 scope boundary.
 * Re-checked on every request, same as the web app: a removed membership
 * takes effect on the next call, not just at token issuance.
 */
export async function requireMobileGuardian(req: NextRequest): Promise<User> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new MobileAuthError(401, "Missing bearer token");

  const userId = await verifyMobileToken(token);
  if (!userId) throw new MobileAuthError(401, "Invalid or expired token");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new MobileAuthError(401, "Account no longer exists");

  const isGuardian = await prisma.membership.findFirst({
    where: { userId: user.id, role: "GUARDIAN", status: "ACTIVE" },
  });
  if (!isGuardian) throw new MobileAuthError(403, "Mobile access is available to guardians only, for now.");

  return user;
}

/** Wraps a mobile route handler so every route gets the same auth boundary and error shape. */
export function mobileRoute(handler: (req: NextRequest, user: User) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const user = await requireMobileGuardian(req);
      return await handler(req, user);
    } catch (error) {
      if (error instanceof MobileAuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  };
}
