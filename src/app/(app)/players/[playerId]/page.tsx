import { notFound } from "next/navigation";

import { requireActiveMembership } from "@/lib/auth/session";
import { roleHasCapability } from "@/lib/permissions/policies";
import { getPlayerForMembership, listLinkableGuardians } from "@/lib/data/players";
import { getPlayerStatTotals } from "@/lib/data/stats";
import { getArrearsSignalForWelfare } from "@/lib/data/payments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ActionToast } from "@/components/shared/action-toast";

import { linkGuardianAction, unlinkGuardianAction } from "../actions";
import { LinkGuardianForm, UnlinkGuardianButton } from "../player-forms";
import { LinkGuardianDialog } from "./guardian-controls";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { playerId } = await params;
  const { active } = await requireActiveMembership();

  const player = await getPlayerForMembership(active, playerId);
  if (!player) notFound();

  // Medical is included by getPlayerForMembership only when the caller is
  // allowed to see it — its presence here, not a role check, is what gates
  // the tab. A guardian viewing their own child always gets it; a coach or
  // welfare officer only if they hold medical:view.
  const hasMedical = Boolean(player.medical);
  const canManage = roleHasCapability(active.role, "club:manage");
  const linkableGuardians = canManage ? await listLinkableGuardians(active, player.id) : [];
  const stats = await getPlayerStatTotals(active, player.id);
  const arrearsSignal = await getArrearsSignalForWelfare(active);
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ActionToast param="ok" message="Saved" />
      {error ? (
        <div className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {player.firstName} {player.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{player.team.name}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
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
              {arrearsSignal ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arrears</span>
                  {arrearsSignal.has(player.id) ? (
                    <Badge variant="destructive">In arrears</Badge>
                  ) : (
                    <span>No arrears on record</span>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardContent className="flex flex-col gap-2 pt-6 text-sm">
              <Row label="Appearances" value={String(stats?.appearances ?? 0)} />
              <Row label="Goals" value={String(stats?.goals ?? 0)} />
              <Row label="Assists" value={String(stats?.assists ?? 0)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Guardians</CardTitle>
                {canManage ? (
                  <CardDescription>Everyone here can see this child&apos;s record.</CardDescription>
                ) : null}
              </div>
              {canManage ? (
                <LinkGuardianDialog
                  form={
                    <LinkGuardianForm
                      action={linkGuardianAction}
                      playerId={player.id}
                      guardians={linkableGuardians}
                    />
                  }
                />
              ) : null}
            </CardHeader>
            <CardContent>
              {player.guardians.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guardians linked yet.</p>
              ) : (
                <ul className="flex flex-col divide-y text-sm">
                  {player.guardians.map((guardianPlayer) => (
                    <li key={guardianPlayer.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p>{guardianPlayer.guardian.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {guardianPlayer.guardian.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {guardianPlayer.relationship}
                          {guardianPlayer.isPrimaryContact ? " · Primary" : ""}
                        </span>
                        {canManage ? (
                          <UnlinkGuardianButton
                            action={unlinkGuardianAction}
                            playerId={player.id}
                            guardianUserId={guardianPlayer.guardian.id}
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
