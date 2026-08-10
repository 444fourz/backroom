import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/shell/user-menu";

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
  role: string;
  showSwitchClub: boolean;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{clubName}</span>
        {teamName ? <span className="text-muted-foreground">· {teamName}</span> : null}
        <Badge variant="secondary" className="ml-2 capitalize">
          {role.toLowerCase()}
        </Badge>
      </div>
      <UserMenu name={userName} email={userEmail} showSwitchClub={showSwitchClub} />
    </header>
  );
}
