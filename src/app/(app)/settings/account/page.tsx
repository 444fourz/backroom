import { requireCurrentUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActionToast } from "@/components/shared/action-toast";

import { changePasswordAction } from "./actions";

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireCurrentUser();
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <ActionToast param="success" message="Password updated" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Security settings for your ClubCore account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>You&apos;ll stay signed in on this device after changing it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePasswordAction} className="flex flex-col gap-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="mt-2 self-start">
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
