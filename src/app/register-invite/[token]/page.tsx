// Route shape reserved for the member-invite/onboarding flow — not
// implemented in this pass (see plan: "Explicit Deferrals").
export default async function RegisterInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await params;
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-lg font-semibold">Invitations aren&apos;t set up yet</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This is where accepting a club invite will happen. For now, ask your club admin to create your
        account directly.
      </p>
    </div>
  );
}
