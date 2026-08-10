import { notFound } from "next/navigation";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { getCredentialForMembership } from "@/lib/data/credentials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialStatusBadge } from "@/components/shared/status-badge";

export default async function CredentialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { active } = await requireAnyCapability(["credential:view:club", "credential:view:own"]);

  const credential = await getCredentialForMembership(active, id);
  if (!credential) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{credential.user.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {credential.type.toLowerCase().replaceAll("_", " ")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credential details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {credential.referenceNumber ? <Row label="Reference" value={credential.referenceNumber} /> : null}
          <Row label="Issued" value={credential.issueDate.toLocaleDateString("en-GB")} />
          <Row label="Expires" value={credential.expiryDate.toLocaleDateString("en-GB")} />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <CredentialStatusBadge expiryDate={credential.expiryDate} />
          </div>
        </CardContent>
      </Card>
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
