"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RolloverSeasonDialog({ action }: { action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Roll over to new season
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Roll over to a new season</DialogTitle>
          <DialogDescription>
            The current season closes and this one becomes active. Teams and players carry
            forward automatically — registration, consents and invoices start fresh.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Season label</Label>
            <Input id="label" name="label" required minLength={2} placeholder="e.g. 2026/27" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Starts</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Ends</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Roll over</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
