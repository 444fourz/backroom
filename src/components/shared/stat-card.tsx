import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  href,
  label,
  value,
  icon: Icon,
  className,
}: {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card
        className={cn(
          "transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/25 group-focus-visible:ring-2 group-focus-visible:ring-ring",
          className,
        )}
      >
        <CardContent className="flex items-center gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
            <p className="truncate text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
