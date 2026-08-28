import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

import { requireAnyCapability } from "@/lib/permissions/guard";
import { getPlayerRegistrationForMembership, getRegistrationWizardData } from "@/lib/data/registration";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegistrationStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  updateEmergencyContactAction,
  updateMedicalInfoAction,
  updateConsentsAction,
  submitRegistrationAction,
} from "../actions";
import { EmergencyContactDialog, MedicalInfoDialog, ConsentDialog } from "../registration-forms";

function formatPence(pence: number) {
  return (pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export default async function PlayerRegistrationPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const { active } = await requireAnyCapability(["registration:view:all", "registration:view:own"]);

  const wizard = active.role === "GUARDIAN" ? await getRegistrationWizardData(active, playerId) : null;
  if (wizard) return <RegistrationWizard data={wizard} />;

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

type WizardData = NonNullable<Awaited<ReturnType<typeof getRegistrationWizardData>>>;

function RegistrationWizard({ data }: { data: WizardData }) {
  const { player, season, registrationForm, invoice, consentStatus } = data;

  const contactComplete = Boolean(player.medical?.emergencyContactName && player.medical?.emergencyContactPhone);
  const medicalConfirmed = Boolean(
    registrationForm?.dataJson && typeof registrationForm.dataJson === "object"
      ? (registrationForm.dataJson as Record<string, unknown>).medicalConfirmed
      : false,
  );
  const consentComplete = consentStatus.every((consent) => consent.granted);
  const feeComplete = registrationForm?.status === "COMPLETE";

  const steps = [
    { key: "details", label: `${player.firstName}'s details`, description: "Confirmed from last season", complete: true },
    { key: "contact", label: "Emergency contacts", description: contactComplete ? "On file" : "Not yet added", complete: contactComplete },
    { key: "medical", label: "Medical and allergies", description: medicalConfirmed ? "Reviewed" : "Not yet reviewed", complete: medicalConfirmed },
    { key: "consent", label: "Consent forms", description: "Photos, travel, code of conduct", complete: consentComplete },
    { key: "fee", label: "Registration fee", description: invoice ? formatPence(invoice.amountPence) : "Not yet invoiced", complete: feeComplete },
  ];
  const completedCount = steps.filter((step) => step.complete).length;
  const stepsLeft = steps.length - completedCount;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Register {player.firstName} for {season.label}
        </h1>
        <p className="text-sm text-muted-foreground">
          {player.team.name} · closes {season.endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {completedCount} of {steps.length}
            </p>
          </div>

          {completedCount === 1 ? (
            <p className="text-sm text-muted-foreground">
              We&apos;ve filled in everything we already had from last season. Just check it&apos;s right.
            </p>
          ) : null}

          <div className="flex flex-col divide-y">
            <StepRow step={steps[0]}>
              <span className="text-xs text-muted-foreground">Contact the secretary to correct a name.</span>
            </StepRow>

            <StepRow step={steps[1]}>
              <EmergencyContactDialog
                action={updateEmergencyContactAction}
                playerId={player.id}
                currentName={player.medical?.emergencyContactName ?? ""}
                currentPhone={player.medical?.emergencyContactPhone ?? ""}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    {contactComplete ? "Edit" : "Add"}
                  </Button>
                }
              />
            </StepRow>

            <StepRow step={steps[2]}>
              {contactComplete ? (
                <MedicalInfoDialog
                  action={updateMedicalInfoAction}
                  playerId={player.id}
                  currentAllergies={player.medical?.allergies ?? ""}
                  currentConditions={player.medical?.conditions ?? ""}
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      {medicalConfirmed ? "Edit" : "Add"}
                    </Button>
                  }
                />
              ) : (
                <span className="text-xs text-muted-foreground">Add emergency contacts first</span>
              )}
            </StepRow>

            <StepRow step={steps[3]}>
              <ConsentDialog
                action={updateConsentsAction}
                playerId={player.id}
                consents={consentStatus}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    {consentComplete ? "Edit" : "Review"}
                  </Button>
                }
              />
            </StepRow>

            <StepRow step={steps[4]}>
              <span className="text-xs text-muted-foreground">
                {invoice ? invoice.status.toLowerCase() : "pending"}
              </span>
            </StepRow>
          </div>
        </CardContent>
      </Card>

      {invoice ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration fee</CardTitle>
            <CardDescription>{invoice.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-lg font-semibold">{formatPence(invoice.amountPence)}</span>
            <span className="text-sm text-muted-foreground">
              Due {invoice.dueDate.toLocaleDateString("en-GB")}
            </span>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your club will add the registration fee once your registration is reviewed.
        </p>
      )}

      {feeComplete ? (
        <div className="rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm text-primary">
          Registration submitted{registrationForm?.submittedAt ? ` on ${registrationForm.submittedAt.toLocaleDateString("en-GB")}` : ""}.
        </div>
      ) : (
        <form action={submitRegistrationAction}>
          <input type="hidden" name="playerId" value={player.id} />
          <Button type="submit" className="w-full" size="lg">
            {stepsLeft > 1 ? `Continue — ${stepsLeft} steps left` : "Submit registration"}
          </Button>
        </form>
      )}
    </div>
  );
}

function StepRow({ step, children }: { step: { label: string; description: string; complete: boolean }; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        {step.complete ? (
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
        ) : (
          <Circle className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className={cn("text-sm font-medium", step.complete ? undefined : "text-muted-foreground")}>{step.label}</p>
          <p className="text-xs text-muted-foreground">{step.description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
