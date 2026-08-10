import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Edge runtime only — this verifies the JWT is present and validly signed
// and redirects to /login if not. It intentionally does nothing more: role,
// club/team scope and per-field visibility (e.g. medical data) are enforced
// in Node-runtime Server Components and the data-access layer, which can
// reach the database. Never add fine-grained authorization logic here.
export default async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/select-club",
    "/availability/:path*",
    "/fixtures/:path*",
    "/payments/:path*",
    "/registration/:path*",
    "/safeguarding/:path*",
    "/club/:path*",
    "/coaching/:path*",
    "/players/:path*",
    "/settings/:path*",
  ],
};
