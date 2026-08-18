"use client";

import { useState, type ReactNode } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteDialog({ form }: { form: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite someone to the club</DialogTitle>
          <DialogDescription>
            They&apos;ll join in the role you choose. You can change it later.
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}

export function RevokeInviteButton({
  action,
  inviteId,
}: {
  action: (formData: FormData) => void;
  inviteId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="inviteId" value={inviteId} />
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
        Revoke
      </Button>
    </form>
  );
}
