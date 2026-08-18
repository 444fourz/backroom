"use client";

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

export function RenamePlayerForm({
  action,
  playerId,
  firstName,
  lastName,
}: {
  action: (formData: FormData) => void;
  playerId: string;
  firstName: string;
  lastName: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="playerId" value={playerId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={firstName} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={lastName} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        This is a child&apos;s record, so the change is recorded in the audit log.
      </p>
      <Button type="submit" className="self-end">
        Save name
      </Button>
    </form>
  );
}

export function MovePlayerForm({
  action,
  playerId,
  currentTeamId,
  currentStatus,
  teams,
}: {
  action: (formData: FormData) => void;
  playerId: string;
  currentTeamId: string;
  currentStatus: string;
  teams: TeamOption[];
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="playerId" value={playerId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="teamId">Team</Label>
        <Select name="teamId" defaultValue={currentTeamId}>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={currentStatus}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="LEFT">Left the club</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="self-end">
        Save
      </Button>
    </form>
  );
}

export function LinkGuardianForm({
  action,
  playerId,
  guardians,
}: {
  action: (formData: FormData) => void;
  playerId: string;
  guardians: { id: string; name: string; email: string }[];
}) {
  if (guardians.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Everyone with a guardian role at this club is already linked to this player. Invite a new
        guardian from the Members page first.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="playerId" value={playerId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guardianUserId">Guardian</Label>
        <Select name="guardianUserId" required>
          <SelectTrigger id="guardianUserId" className="w-full">
            <SelectValue placeholder="Choose a guardian" />
          </SelectTrigger>
          <SelectContent>
            {guardians.map((guardian) => (
              <SelectItem key={guardian.id} value={guardian.id}>
                {guardian.name} · {guardian.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="relationship">Relationship</Label>
        <Input id="relationship" name="relationship" placeholder="Parent" defaultValue="Parent" />
      </div>
      <p className="text-xs text-muted-foreground">
        They&apos;ll be able to see this child&apos;s schedule, payments and record.
      </p>
      <Button type="submit" className="self-end">
        Link guardian
      </Button>
    </form>
  );
}

export function UnlinkGuardianButton({
  action,
  playerId,
  guardianUserId,
}: {
  action: (formData: FormData) => void;
  playerId: string;
  guardianUserId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="guardianUserId" value={guardianUserId} />
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
        Unlink
      </Button>
    </form>
  );
}
