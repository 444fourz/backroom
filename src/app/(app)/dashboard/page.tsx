import Link from "next/link";
import { CalendarDays, ShieldAlert, Users, Wallet, ClipboardList, CheckCircle2 } from "lucide-react";

import { requireActiveMembership } from "@/lib/auth/session";
import { roleHasCapability } from "@/lib/permissions/policies";
import { listEventsForMembership } from "@/lib/data/events";
import {
  listInvoicesForMembership,
  getArrearsSummary,
  getMonthlyCollectionSummary,
} from "@/lib/data/payments";
import { listCredentialsForMembership, isExpiringSoon } from "@/lib/data/credentials";
import { listPlayersForMembership, countActivePlayersForClub } from "@/lib/data/players";
import { listRegistrationsForMembership } from "@/lib/data/registration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { cn } from "@/lib/utils";

function formatPence(pence: number) {
  return (pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

type Attention = {
  href: string;
  title: string;
  description: string;
  urgent: boolean;
};

export default async function DashboardPage() {
  const { user, active } = await requireActiveMembership();

  const canSeeCredentialStatus =
    roleHasCapability(active.role, "credential:view:own") ||
    roleHasCapability(active.role, "credential:view:club") ||
    roleHasCapability(active.role, "credential:status:view");
  const canSeeRegistrations = roleHasCapability(active.role, "registration:view:all");

  const [events, credentials, registrations] = await Promise.all([
    listEventsForMembership(active),
    canSeeCredentialStatus ? listCredentialsForMembership(active) : Promise.resolve([]),
    canSeeRegistrations ? listRegistrationsForMembership(active) : Promise.resolve([]),
  ]);

  const upcomingEvents = events.filter((event) => event.startTime > new Date()).slice(0, 5);
  const expiringCredentials = credentials.filter((credential) => isExpiringSoon(credential.expiryDate));
  const incompleteRegistrations = registrations.filter((registration) => registration.status !== "COMPLETE");

  const isTreasurer = active.role === "TREASURER";
  const [arrearsSummary, collections] = await Promise.all([
    isTreasurer ? getArrearsSummary(active) : Promise.resolve(null),
    isTreasurer ? getMonthlyCollectionSummary(active) : Promise.resolve(null),
  ]);
  const ownInvoices = active.role === "GUARDIAN" ? await listInvoicesForMembership(active) : [];
  const pendingOwnInvoices = ownInvoices.filter((invoice) => invoice.status !== "PAID");

  const players = roleHasCapability(active.role, "player:view:team") ? await listPlayersForMembership(active) : [];
  const activePlayerCount = isTreasurer
    ? await countActivePlayersForClub(active)
    : players.filter((player) => player.status === "ACTIVE").length;

  // "Needs attention" — the things worth acting on right now, most urgent
  // first. Each item is scoped to what this role can already see; nothing
  // here surfaces data the role wouldn't otherwise have access to.
  const attention: Attention[] = [];
  if (expiringCredentials.length > 0) {
    const urgent = expiringCredentials.some((credential) => credential.expiryDate.getTime() - Date.now() < 7 * 86400000);
    attention.push({
      href: "/safeguarding",
      title: `${expiringCredentials.length} credential${expiringCredentials.length === 1 ? "" : "s"} expire${expiringCredentials.length === 1 ? "s" : ""} in 30 days`,
      description: expiringCredentials
        .slice(0, 3)
        .map((credential) => credential.user.name)
        .join(", "),
      urgent,
    });
  }
  if (incompleteRegistrations.length > 0) {
    attention.push({
      href: "/registration",
      title: `${incompleteRegistrations.length} registration${incompleteRegistrations.length === 1 ? "" : "s"} incomplete`,
      description: "Missing consent or medical details",
      urgent: false,
    });
  }
  if (isTreasurer && arrearsSummary && arrearsSummary.totalPence > 0) {
    const over60 = arrearsSummary.buckets.find((bucket) => bucket.key === "60+");
    attention.push({
      href: "/payments/arrears",
      title: `${formatPence(arrearsSummary.totalPence)} in arrears`,
      description: `${arrearsSummary.familyCount} families${over60 && over60.familyCount > 0 ? ` · ${over60.familyCount} over 60 days` : ""}`,
      urgent: false,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">
            {active.club.name}
            {active.team ? ` · ${active.team.name}` : ""}
          </p>
        </div>
        {attention.length === 0 ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            <CheckCircle2 className="size-3" />
            All clear
          </Badge>
        ) : null}
      </div>

      {attention.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Needs attention · {attention.length}</p>
          {attention.map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-sm border px-4 py-3 text-sm transition-colors hover:bg-accent",
                item.urgent ? "border-destructive/40 bg-destructive/5" : "border-border",
              )}
            >
              <div>
                <p className={cn("font-medium", item.urgent ? "text-destructive" : undefined)}>{item.title}</p>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {isTreasurer && collections ? (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">This month</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl font-semibold tracking-tight">{formatPence(collections.collectedPence)}</p>
                {collections.expectedPence > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((collections.collectedPence / collections.expectedPence) * 100)}% of expected
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active players</p>
                <p className="text-2xl font-semibold tracking-tight">{activePlayerCount}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard href="/fixtures" label="Upcoming fixtures" value={upcomingEvents.length} icon={CalendarDays} />

          {roleHasCapability(active.role, "player:view:team") ? (
            <StatCard href="/players" label="Active players" value={activePlayerCount} icon={Users} />
          ) : null}

          {canSeeRegistrations ? (
            <StatCard
              href="/registration"
              label="Registrations incomplete"
              value={incompleteRegistrations.length}
              icon={ClipboardList}
            />
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
      )}

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
