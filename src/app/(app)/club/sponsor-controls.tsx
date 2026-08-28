"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddSponsorDialog({ action }: { action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-4" />
          Add sponsor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a sponsor</DialogTitle>
          <DialogDescription>Shown to everyone on the club overview page.</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required minLength={2} placeholder="e.g. Perry Barr Autos" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="websiteUrl">Website (optional)</Label>
            <Input id="websiteUrl" name="websiteUrl" placeholder="https://example.com" />
          </div>
          <Button type="submit" className="self-end">
            Add sponsor
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveSponsorButton({
  action,
  sponsorId,
}: {
  action: (formData: FormData) => void;
  sponsorId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="sponsorId" value={sponsorId} />
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
        <X className="size-4" />
        <span className="sr-only">Remove sponsor</span>
      </Button>
    </form>
  );
}
