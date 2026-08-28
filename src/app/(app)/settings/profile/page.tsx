import { requireCurrentUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { updateProfileAction } from "./actions";

export default async function ProfileSettingsPage() {
  const user = await requireCurrentUser();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your name and email as other club members see them.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <CardDescription>Email changes aren&apos;t available yet, ask your club secretary.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user.email} disabled />
            </div>
            <Button type="submit" className="mt-2 self-start">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
