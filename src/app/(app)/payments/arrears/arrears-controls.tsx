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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function PaymentPlanDialog({
  action,
  invoiceId,
  playerName,
  outstandingLabel,
}: {
  action: (formData: FormData) => void;
  invoiceId: string;
  playerName: string;
  outstandingLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Payment plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up a payment plan</DialogTitle>
          <DialogDescription>
            Splits {playerName}&apos;s {outstandingLabel} balance into equal installments, 30 days apart. The
            original invoice is closed once the plan is created.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="installments">Number of installments</Label>
            <Select name="installments" defaultValue="3">
              <SelectTrigger id="installments" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} installments
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="self-end">
            Create payment plan
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
