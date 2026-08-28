"use client";

import { useState, type ReactNode } from "react";

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

function StepDialog({
  trigger,
  title,
  description,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function EmergencyContactDialog({
  trigger,
  action,
  playerId,
  currentName,
  currentPhone,
}: {
  trigger: ReactNode;
  action: (formData: FormData) => void;
  playerId: string;
  currentName: string;
  currentPhone: string;
}) {
  return (
    <StepDialog trigger={trigger} title="Emergency contact" description="Who should we call if something happens at training or a match?">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="playerId" value={playerId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergencyContactName">Name</Label>
          <Input id="emergencyContactName" name="emergencyContactName" defaultValue={currentName} required minLength={2} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergencyContactPhone">Phone</Label>
          <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={currentPhone} required minLength={5} />
        </div>
        <Button type="submit" className="self-end">
          Save
        </Button>
      </form>
    </StepDialog>
  );
}

export function MedicalInfoDialog({
  trigger,
  action,
  playerId,
  currentAllergies,
  currentConditions,
}: {
  trigger: ReactNode;
  action: (formData: FormData) => void;
  playerId: string;
  currentAllergies: string;
  currentConditions: string;
}) {
  return (
    <StepDialog trigger={trigger} title="Medical and allergies" description="Leave a field blank if there's nothing to note.">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="playerId" value={playerId} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="allergies">Allergies</Label>
          <Input id="allergies" name="allergies" defaultValue={currentAllergies} placeholder="e.g. Peanuts" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conditions">Conditions / medication</Label>
          <Input id="conditions" name="conditions" defaultValue={currentConditions} placeholder="e.g. Asthma inhaler" />
        </div>
        <Button type="submit" className="self-end">
          Save
        </Button>
      </form>
    </StepDialog>
  );
}

const CONSENT_LABELS: Record<string, { label: string; description: string }> = {
  PHOTO: { label: "Photos", description: "Photos/video of your child may be used in club media." },
  MEDICAL_TREATMENT: { label: "Emergency medical treatment", description: "Staff can authorise emergency treatment if you can't be reached." },
  TRAVEL: { label: "Travel", description: "Your child can travel with the team to away fixtures." },
  CODE_OF_CONDUCT: { label: "Code of conduct", description: "You and your child agree to the club's code of conduct." },
};

export function ConsentDialog({
  trigger,
  action,
  playerId,
  consents,
}: {
  trigger: ReactNode;
  action: (formData: FormData) => void;
  playerId: string;
  consents: { type: string; granted: boolean; previouslyGranted: boolean }[];
}) {
  return (
    <StepDialog trigger={trigger} title="Consent forms" description="Required each season, last season's answers are pre-filled as a starting point.">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="playerId" value={playerId} />
        {consents.map((consent) => {
          const meta = CONSENT_LABELS[consent.type];
          return (
            <label key={consent.type} className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name={consent.type}
                defaultChecked={consent.granted || consent.previouslyGranted}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="font-medium">{meta?.label ?? consent.type}</span>
                {meta ? <span className="block text-xs text-muted-foreground">{meta.description}</span> : null}
              </span>
            </label>
          );
        })}
        <Button type="submit" className="self-end">
          Save consents
        </Button>
      </form>
    </StepDialog>
  );
}
