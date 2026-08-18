"use client";

import { useState } from "react";
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

export type TeamOption = { id: string; name: string };

const ROLE_OPTIONS: { value: MembershipRole; label: string; note: string }[] = [
  { value: "SECRETARY", label: "Secretary", note: "Runs the club and manages people" },
  { value: "WELFARE_OFFICER", label: "Welfare officer", note: "Sees medical and safeguarding" },
  { value: "TREASURER", label: "Treasurer", note: "Sees subs, payments and arrears" },
  { value: "COACH", label: "Coach", note: "Their own team only" },
  { value: "GUARDIAN", label: "Guardian", note: "Their own children only" },
];

/** Role picker that reveals the team field only when the role needs one. */
function RoleAndTeamFields({
  teams,
  defaultRole,
  defaultTeamId,
}: {
  teams: TeamOption[];
  defaultRole?: MembershipRole;
  defaultTeamId?: string | null;
}) {
  const [role, setRole] = useState<MembershipRole>(defaultRole ?? "GUARDIAN");
  const selected = ROLE_OPTIONS.find((option) => option.value === role);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Role</Label>
        <Select name="role" value={role} onValueChange={(next) => setRole(next as MembershipRole)}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected ? <p className="text-xs text-muted-foreground">{selected.note}</p> : null}
      </div>

      {role === "COACH" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="teamId">Team</Label>
          <Select name="teamId" defaultValue={defaultTeamId ?? undefined}>
            <SelectTrigger id="teamId" className="w-full">
              <SelectValue placeholder="Choose a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );
}

export function ChangeRoleForm({
  action,
  membershipId,
  currentRole,
  currentTeamId,
  teams,
}: {
  action: (formData: FormData) => void;
  membershipId: string;
  currentRole: MembershipRole;
  currentTeamId: string | null;
  teams: TeamOption[];
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <RoleAndTeamFields teams={teams} defaultRole={currentRole} defaultTeamId={currentTeamId} />
      <Button type="submit" className="self-end">
        Save role
      </Button>
    </form>
  );
}

export function RenameForm({
  action,
  userId,
  currentName,
}: {
  action: (formData: FormData) => void;
  userId: string;
  currentName: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={currentName} required minLength={2} />
      </div>
      <Button type="submit" className="self-end">
        Save name
      </Button>
    </form>
  );
}

export function RemoveAccessForm({
  action,
  membershipId,
  name,
}: {
  action: (formData: FormData) => void;
  membershipId: string;
  name: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <p className="text-sm text-muted-foreground">
        {name} will lose access to this club immediately. Their record stays, so you can invite them
        back later.
      </p>
      <Button type="submit" variant="destructive" className="self-end">
        Remove access
      </Button>
    </form>
  );
}

export function InviteForm({
  action,
  teams,
}: {
  action: (formData: FormData) => void;
  teams: TeamOption[];
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" required placeholder="them@example.com" />
      </div>
      <RoleAndTeamFields teams={teams} />
      <p className="text-xs text-muted-foreground">
        We can&apos;t send the email yet, so you&apos;ll get a link to pass on yourself.
      </p>
      <Button type="submit" className="self-end">
        Create invite
      </Button>
    </form>
  );
}

/** Copies the invite link — the stand-in for sending an email. */
export function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        const url = `${window.location.origin}/register-invite/${token}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this invite link:", url);
        }
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
