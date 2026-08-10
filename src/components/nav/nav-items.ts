import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Wallet,
  ClipboardList,
  ShieldCheck,
  Building2,
  Dumbbell,
  Users,
  Settings,
} from "lucide-react";

import type { Capability } from "@/lib/permissions/policies";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown if the caller has ANY of these capabilities. */
  capabilities: Capability[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, capabilities: ["dashboard:view"] },
  { href: "/availability", label: "Availability", icon: CalendarCheck, capabilities: ["availability:respond", "event:create"] },
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays, capabilities: ["event:view"] },
  { href: "/payments", label: "Payments", icon: Wallet, capabilities: ["payment:view:all", "payment:view:own"] },
  { href: "/registration", label: "Registration", icon: ClipboardList, capabilities: ["registration:view:all", "registration:view:own"] },
  { href: "/safeguarding", label: "Safeguarding", icon: ShieldCheck, capabilities: ["credential:view:club", "credential:view:own"] },
  { href: "/players", label: "Players", icon: Users, capabilities: ["player:view:team", "player:view:own"] },
  { href: "/coaching", label: "Coaching", icon: Dumbbell, capabilities: ["coaching:view"] },
  { href: "/club", label: "Club", icon: Building2, capabilities: ["club:manage"] },
  { href: "/settings/profile", label: "Settings", icon: Settings, capabilities: ["dashboard:view"] },
];
