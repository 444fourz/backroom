import Link from "next/link";
import { CalendarDays, ShieldAlert, Users, Wallet } from "lucide-react";

import { requireActiveMembership } from "@/lib/auth/session";
import { roleHasCapability } from "@/lib/permissions/policies";
import { listEventsForMembership } from "@/lib/data/events";
import { listArrearsForMembership, listInvoicesForMembership } from "@/lib/data/payments";
import { listCredentialsForMembership, isExpiringSoon } from "@/lib/data/credentials";
import { listPlayersForMembership } from "@/lib/data/players";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";

export default async function DashboardPage() {
  const { user, active } = await requireActiveMembership();

  const canSeeCredentialStatus =
    roleHasCapability(active.role, "credential:view:own") ||
    roleHasCapability(active.role, "credential:view:club") ||
    roleHasCapability(active.role, "credential:status:view");

  const [events, credentials] = await Promise.all([
    listEventsForMembership(active),
    canSeeCredentialStatus ? listCredentialsForMembership(active) : Promise.resolve([]),
  ]);

  const upcomingEvents = events.filter((event) => event.startTime > new Date()).slice(0, 5);
  const expiringCredentials = credentials.filter((credential) => isExpiringSoon(credential.expiryDate));

  const arrears = roleHasCapability(active.role, "payment:manage") ? await listArrearsForMembership(active) : [];
  const ownInvoices = active.role === "GUARDIAN" ? await listInvoicesForMembership(active) : [];
  const pendingOwnInvoices = ownInvoices.filter((invoice) => invoice.status !== "PAID");

  const players = roleHasCapability(active.role, "player:view:team") ? await listPlayersForMembership(active) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {active.club.name}
          {active.team ? ` · ${active.team.name}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/fixtures" label="Upcoming fixtures" value={upcomingEvents.length} icon={CalendarDays} />

        {roleHasCapability(active.role, "player:view:team") ? (
          <StatCard href="/players" label="Players" value={players.length} icon={Users} />
        ) : null}

        {roleHasCapability(active.role, "payment:manage") ? (
          <StatCard href="/payments/arrears" label="Outstanding arrears" value={arrears.length} icon={Wallet} />
        ) : null}

        {active.role === "GUARDIAN" ? (
          <StatCard href="/payments" label="Payments due" value={pendingOwnInvoices.length} icon={Wallet} />
        ) : null}

        {expiringCredentials.length > 0 ? (
          <StatCard
            href="/safeguarding"
            label="Credentials expiring soon"
            value={expiringCredentials.length}
            icon={ShieldAlert}
          />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next up</CardTitle>
          <CardDescription>Upcoming training and matches for your team.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {upcomingEvents.map((event) => (
                <li
                  key={event.id}
                  className="-mx-2 flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div>
                    <Link href={`/fixtures/${event.id}`} className="font-medium hover:underline">
                      {event.title}
                    </Link>
                    <p className="text-muted-foreground">{event.team.name}</p>
                  </div>
                  <time className="text-muted-foreground" dateTime={event.startTime.toISOString()}>
                    {event.startTime.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
