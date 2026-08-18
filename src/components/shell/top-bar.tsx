import type { MembershipRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/shell/user-menu";
import { roleLabel } from "@/lib/permissions/policies";

export function TopBar({
  userName,
  userEmail,
  clubName,
  teamName,
  role,
  showSwitchClub,
}: {
  userName: string;
  userEmail: string;
  clubName: string;
  teamName: string | null;
  role: MembershipRole;
  showSwitchClub: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/75 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/75 md:px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{clubName}</span>
        {teamName ? <span className="text-muted-foreground">· {teamName}</span> : null}
        <Badge variant="outline" className="ml-2 border-transparent bg-primary/10 text-primary">
          {roleLabel(role)}
        </Badge>
      </div>
      <UserMenu name={userName} email={userEmail} showSwitchClub={showSwitchClub} />
    </header>
  );
}
