import { notFound } from "next/navigation";

import { requireActiveMembership } from "@/lib/auth/session";
import { getPlayerForMembership } from "@/lib/data/players";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const { active } = await requireActiveMembership();

  const player = await getPlayerForMembership(active, playerId);
  if (!player) notFound();

  // Medical is included by getPlayerForMembership only when the caller is
  // allowed to see it — its presence here, not a role check, is what gates
  // the tab. A guardian viewing their own child always gets it; a coach or
  // admin only if they hold medical:view.
  const hasMedical = Boolean(player.medical);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {player.firstName} {player.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{player.team.name}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          {hasMedical ? <TabsTrigger value="medical">Medical</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="flex flex-col gap-2 pt-6 text-sm">
              <Row label="Date of birth" value={player.dateOfBirth.toLocaleDateString("en-GB")} />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={player.status === "ACTIVE" ? "default" : "secondary"}>
                  {player.status.toLowerCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guardians</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y text-sm">
                {player.guardians.map((guardianPlayer) => (
                  <li key={guardianPlayer.id} className="flex items-center justify-between py-2">
                    <div>
                      <p>{guardianPlayer.guardian.name}</p>
                      <p className="text-xs text-muted-foreground">{guardianPlayer.guardian.email}</p>
                    </div>
                    <span className="text-muted-foreground">
                      {guardianPlayer.relationship}
                      {guardianPlayer.isPrimaryContact ? " · Primary" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {hasMedical && player.medical ? (
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medical information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <Row label="Allergies" value={player.medical.allergies ?? "None recorded"} />
                <Row label="Conditions" value={player.medical.conditions ?? "None recorded"} />
                <Row label="Emergency contact" value={player.medical.emergencyContactName} />
                <Row label="Emergency phone" value={player.medical.emergencyContactPhone} />
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
