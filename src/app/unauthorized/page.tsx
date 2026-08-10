import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <div>
        <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your role doesn&apos;t include permission to view this. If you think that&apos;s wrong, ask your club
          admin to check your role.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
