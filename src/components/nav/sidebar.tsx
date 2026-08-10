import Link from "next/link";
import Image from "next/image";
import type { MembershipRole } from "@prisma/client";

import { roleHasCapability } from "@/lib/permissions/policies";
import { NAV_ITEMS } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: MembershipRole }) {
  const items = NAV_ITEMS.filter((item) =>
    item.capabilities.some((capability) => roleHasCapability(role, capability)),
  );

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Image src="/logo-icon.png" alt="" width={80} height={79} className="size-7" priority />
        <span className="text-lg font-semibold tracking-tight">ClubCore</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
