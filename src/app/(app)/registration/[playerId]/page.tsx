import { notFound } from "next/navigation";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { getPlayerRegistrationForMembership } from "@/lib/data/registration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";

export default async function PlayerRegistrationPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const { active } = await requireAnyCapability(["registration:view:all", "registration:view:own"]);

  const data = await getPlayerRegistrationForMembership(active, playerId);
  if (!data) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {data.player.firstName} {data.player.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">Registration & consent history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration by season</CardTitle>
        </CardHeader>
        <CardContent>
          {data.registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registration on file yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {data.registrations.map((registration) => (
                <li key={registration.id} className="flex items-center justify-between py-2">
                  <span>{registration.season.label}</span>
                  <RegistrationStatusBadge status={registration.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consents</CardTitle>
        </CardHeader>
        <CardContent>
          {data.consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consents recorded yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {data.consents.map((consent) => (
                <li key={consent.id} className="flex items-center justify-between py-2">
                  <span className="capitalize">{consent.type.toLowerCase().replaceAll("_", " ")}</span>
                  <Badge variant={consent.granted ? "default" : "secondary"}>
                    {consent.granted ? "Granted" : "Not granted"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
