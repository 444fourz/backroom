import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { selectMembershipAction } from "./actions";

export default async function SelectClubPage() {
  const user = await requireCurrentUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { club: true, team: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) redirect("/unauthorized");
  if (memberships.length === 1) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Which club?</CardTitle>
          <CardDescription>You have more than one role. Pick which one to use.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {memberships.map((membership) => (
            <form key={membership.id} action={selectMembershipAction}>
              <input type="hidden" name="membershipId" value={membership.id} />
              <Button type="submit" variant="outline" className="w-full justify-between">
                <span>{membership.club.name}</span>
                <span className="text-muted-foreground">
                  {membership.role.toLowerCase()}
                  {membership.team ? ` · ${membership.team.name}` : ""}
                </span>
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
