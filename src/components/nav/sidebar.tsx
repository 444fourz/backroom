"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { MembershipRole } from "@prisma/client";

import { roleHasCapability } from "@/lib/permissions/policies";
import { NAV_ITEMS } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: MembershipRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) =>
    item.capabilities.some((capability) => roleHasCapability(role, capability)),
  );

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Image src="/logo-icon.png" alt="" width={141} height={141} className="size-7" priority />
        <span className="text-lg font-semibold tracking-tight">BackRoom</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 h-4 w-0.5 rounded-full bg-primary transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
