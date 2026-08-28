"use client";

import { useState } from "react";

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

export function WaiveInvoiceDialog({
  action,
  invoiceId,
  playerName,
}: {
  action: (formData: FormData) => void;
  invoiceId: string;
  playerName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Waive
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Waive this invoice?</DialogTitle>
          <DialogDescription>
            {playerName}&apos;s balance is written off. This is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" required minLength={3} placeholder="e.g. hardship agreed with the family" />
          </div>
          <Button type="submit" className="self-end">
            Waive invoice
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
