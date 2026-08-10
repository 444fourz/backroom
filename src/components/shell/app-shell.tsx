import type { ReactNode } from "react";
import type { MembershipRole } from "@prisma/client";

import { Sidebar } from "@/components/nav/sidebar";
import { TopBar } from "@/components/shell/top-bar";

export function AppShell({
  role,
  userName,
  userEmail,
  clubName,
  teamName,
  showSwitchClub,
  children,
}: {
  role: MembershipRole;
  userName: string;
  userEmail: string;
  clubName: string;
  teamName: string | null;
  showSwitchClub: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={userName}
          userEmail={userEmail}
          clubName={clubName}
          teamName={teamName}
          role={role}
          showSwitchClub={showSwitchClub}
        />
        <main className="flex-1 overflow-x-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
