import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getActiveMembership } from "@/lib/auth/session";
import {
  CAPABILITY_OWNER,
  ROLE_ADMINISTRATOR,
  roleLabel,
  type Capability,
} from "@/lib/permissions/policies";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const { need } = await searchParams;
  const { active } = await getActiveMembership();

  const detail = need ? CAPABILITY_OWNER[need as Capability] : undefined;
  const isOwnRoleAdmin = active?.role === ROLE_ADMINISTRATOR;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <div className="max-w-md">
        {/* Copy is phrased so the area name is always an object, never a
            subject — that sidesteps singular/plural verb agreement for
            values like "Payments and arrears" vs "Registration and consent". */}
        <h1 className="text-lg font-semibold">
          {detail?.deliberate
            ? `Only the ${roleLabel(detail.owner).toLowerCase()} can see ${detail.area.toLowerCase()}`
            : "You don't have access to this page"}
        </h1>

        {detail?.deliberate ? (
          // A published boundary, not a misconfiguration. Say so plainly —
          // implying it can be escalated away would contradict the
          // safeguarding promise made on the marketing site.
          <p className="mt-2 text-sm text-muted-foreground">
            {active
              ? `A ${roleLabel(active.role).toLowerCase()} doesn't see this, and that separation is deliberate: `
              : "That separation is deliberate: "}
            there&apos;s no setting that opens it up. Ask your{" "}
            {roleLabel(detail.owner).toLowerCase()} if you need something from it.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Your role doesn&apos;t include {detail ? detail.area.toLowerCase() : "this page"}.{" "}
            {isOwnRoleAdmin
              ? "You manage roles for this club, so you can assign it to yourself or someone else."
              : `If that looks wrong, your ${roleLabel(ROLE_ADMINISTRATOR).toLowerCase()} sets who has which role.`}
          </p>
        )}
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
