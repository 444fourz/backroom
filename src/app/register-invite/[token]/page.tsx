import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/db/prisma";
import { roleLabel } from "@/lib/permissions/policies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { acceptInviteAction } from "./actions";
import { AcceptInviteForm } from "./accept-invite-form";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image src="/logo-full.png" alt="BackRoom" width={958} height={242} className="mb-2 h-8 w-auto" priority />
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export default async function RegisterInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { club: { select: { name: true } }, team: { select: { name: true } } },
  });

  if (!invite) {
    return (
      <Shell>
        <CardTitle className="mb-2 text-lg">Invite not found</CardTitle>
        <CardDescription>This link doesn&apos;t match an invite. Ask your club secretary to send a new one.</CardDescription>
      </Shell>
    );
  }

  if (invite.acceptedAt) {
    return (
      <Shell>
        <CardTitle className="mb-2 text-lg">Already accepted</CardTitle>
        <CardDescription>
          This invite has already been used. If that wasn&apos;t you, ask your club secretary to check your club&apos;s
          member list.
        </CardDescription>
        <Button asChild className="mt-4">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </Shell>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <Shell>
        <CardTitle className="mb-2 text-lg">Invite expired</CardTitle>
        <CardDescription>This invite link has expired. Ask your club secretary to send a new one.</CardDescription>
      </Shell>
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });

  const scopeNote = invite.team ? `${roleLabel(invite.role)} (${invite.team.name})` : roleLabel(invite.role);

  if (existingUser) {
    return (
      <Shell>
        <CardTitle className="mb-2 text-lg">You already have an account</CardTitle>
        <CardDescription>
          {invite.email} already has a BackRoom login. Sign in and {invite.club.name} will be added to your account
          as {scopeNote} automatically.
        </CardDescription>
        <Button asChild className="mt-4">
          <Link href="/login">Sign in</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardTitle className="mb-1 text-lg">Join {invite.club.name}</CardTitle>
      <CardDescription className="mb-4">
        You&apos;ve been invited as {scopeNote}. Set a password to create your account.
      </CardDescription>
      <AcceptInviteForm action={acceptInviteAction} token={invite.token} email={invite.email} error={error} />
    </Shell>
  );
}
