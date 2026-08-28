"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { MembershipRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORY_OPTIONS = [
  { value: "POLICY", label: "Policy" },
  { value: "CONSENT_FORM", label: "Consent form" },
  { value: "OTHER", label: "Other" },
];

const VISIBILITY_OPTIONS: { value: MembershipRole; label: string }[] = [
  { value: "WELFARE_OFFICER", label: "Welfare officer" },
  { value: "TREASURER", label: "Treasurer" },
  { value: "COACH", label: "Coaches" },
  { value: "GUARDIAN", label: "Guardians" },
];

export function AddDocumentDialog({ action }: { action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-4" />
          Add document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            There&apos;s no file storage yet, so paste a link: a Google Drive or SharePoint share link
            works fine.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required minLength={2} placeholder="e.g. Code of conduct" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select name="category" defaultValue="POLICY">
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fileUrl">Link</Label>
            <Input id="fileUrl" name="fileUrl" required placeholder="https://…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Also visible to</Label>
            <div className="flex flex-col gap-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="visibility"
                    value={option.value}
                    className="size-4 rounded-sm border-border accent-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">You can always see documents you add.</p>
          </div>
          <DialogFooter>
            <Button type="submit">Add document</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveDocumentButton({
  action,
  documentId,
}: {
  action: (formData: FormData) => void;
  documentId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="documentId" value={documentId} />
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
        <X className="size-4" />
        <span className="sr-only">Remove document</span>
      </Button>
    </form>
  );
}
