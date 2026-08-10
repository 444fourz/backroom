import type { ReactNode } from "react";

import { requireActiveMembership } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, memberships, active } = await requireActiveMembership();

  return (
    <AppShell
      role={active.role}
      userName={user.name}
      userEmail={user.email}
      clubName={active.club.name}
      teamName={active.team?.name ?? null}
      showSwitchClub={memberships.length > 1}
    >
      {children}
    </AppShell>
  );
}
