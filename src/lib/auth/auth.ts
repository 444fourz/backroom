import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // NextAuth v4 does not support database sessions alongside a Credentials
  // provider (a credentials sign-in is never persisted via the adapter), so
  // we use JWT sessions here and re-derive the caller's identity, roles and
  // club/team scope from the database on every request instead of trusting
  // anything embedded in the token — see lib/auth/session.ts and
  // lib/permissions/guard.ts. That also means a deleted Membership or
  // deactivated account takes effect on the very next request, which covers
  // the same "revoke access immediately" need database sessions would have.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        await writeAuditLog({
          actorUserId: user.id,
          action: "auth.login",
          entityType: "User",
          entityId: user.id,
        });

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
