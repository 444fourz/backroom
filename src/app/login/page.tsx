import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Image from "next/image";

import { authOptions } from "@/lib/auth/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; email?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  const { registered, email } = await searchParams;

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image src="/logo-full.png" alt="BackRoom" width={958} height={242} className="mb-2 h-8 w-auto" priority />
          <CardTitle className="text-xl">Sign in to BackRoom</CardTitle>
          <CardDescription>Use the email and password your club secretary set up for you.</CardDescription>
        </CardHeader>
        <CardContent>
          {registered ? (
            <p className="mb-4 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              Account created. Sign in below.
            </p>
          ) : null}
          <LoginForm defaultEmail={email} />
        </CardContent>
      </Card>
    </div>
  );
}
