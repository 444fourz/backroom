import { requireCapability } from "@/lib/permissions/guard";
import { listTeamsForClub } from "@/lib/data/club";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createEventAction } from "./actions";

export default async function NewFixturePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { active } = await requireCapability("event:create");
  const { error } = await searchParams;

  const teams = active.role === "ADMIN" ? await listTeamsForClub(active) : [];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New fixture</h1>
        <p className="text-sm text-muted-foreground">Add a match, tournament or training session.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fixture details</CardTitle>
          <CardDescription>Players and guardians will see this on their availability request.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAction} className="flex flex-col gap-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {active.role === "ADMIN" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teamId">Team</Label>
                <Select name="teamId" required>
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="TRAINING" required>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="MATCH">Match</SelectItem>
                  <SelectItem value="TOURNAMENT">Tournament</SelectItem>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g. vs Kings Heath U10s" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opponent">Opponent (optional)</Label>
              <Input id="opponent" name="opponent" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venueName">Venue</Label>
              <Input id="venueName" name="venueName" placeholder="e.g. Aston Rovers Ground" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="venueAddress">Venue address (optional)</Label>
              <Input id="venueAddress" name="venueAddress" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meetTime">Meet time (optional)</Label>
                <Input id="meetTime" name="meetTime" type="datetime-local" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startTime">Start time</Label>
                <Input id="startTime" name="startTime" type="datetime-local" required />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kitColour">Kit colour (optional)</Label>
              <Input id="kitColour" name="kitColour" placeholder="e.g. Home red" />
            </div>

            <Button type="submit" className="mt-2">
              Create fixture
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
