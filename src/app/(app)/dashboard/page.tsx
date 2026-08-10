import Link from "next/link";
import { CalendarDays, ShieldAlert, Users, Wallet } from "lucide-react";

import { requireActiveMembership } from "@/lib/auth/session";
import { roleHasCapability } from "@/lib/permissions/policies";
import { listEventsForMembership } from "@/lib/data/events";
import { listArrearsForMembership, listInvoicesForMembership } from "@/lib/data/payments";
import { listCredentialsForMembership, isExpiringSoon } from "@/lib/data/credentials";
import { listPlayersForMembership } from "@/lib/data/players";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { user, active } = await requireActiveMembership();

  const [events, credentials] = await Promise.all([
    listEventsForMembership(active),
    roleHasCapability(active.role, "credential:view:own") || roleHasCapability(active.role, "credential:view:club")
      ? listCredentialsForMembership(active)
      : Promise.resolve([]),
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming fixtures</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <CardDescription>
              <Link href="/fixtures" className="underline underline-offset-2">
                View fixtures
              </Link>
            </CardDescription>
          </CardContent>
        </Card>

        {roleHasCapability(active.role, "player:view:team") ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Players</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{players.length}</div>
              <CardDescription>
                <Link href="/players" className="underline underline-offset-2">
                  View roster
                </Link>
              </CardDescription>
            </CardContent>
          </Card>
        ) : null}

        {roleHasCapability(active.role, "payment:manage") ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding arrears</CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{arrears.length}</div>
              <CardDescription>
                <Link href="/payments/arrears" className="underline underline-offset-2">
                  View arrears
                </Link>
              </CardDescription>
            </CardContent>
          </Card>
        ) : null}

        {active.role === "GUARDIAN" ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payments due</CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOwnInvoices.length}</div>
              <CardDescription>
                <Link href="/payments" className="underline underline-offset-2">
                  View payments
                </Link>
              </CardDescription>
            </CardContent>
          </Card>
        ) : null}

        {expiringCredentials.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credentials expiring soon</CardTitle>
              <ShieldAlert className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringCredentials.length}</div>
              <CardDescription>
                <Link href="/safeguarding" className="underline underline-offset-2">
                  View safeguarding
                </Link>
              </CardDescription>
            </CardContent>
          </Card>
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
                <li key={event.id} className="flex items-center justify-between py-2 text-sm">
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
