import { Dumbbell } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { EmptyState } from "@/components/shared/empty-state";

export default async function CoachingPage() {
  await requireCapability("coaching:view");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coaching</h1>
        <p className="text-sm text-muted-foreground">Session planning, match reports and player development notes.</p>
      </div>
      <EmptyState
        icon={Dumbbell}
        title="Coaching tools are coming"
        description="Session plans and match reports will live here. The AI will draft, the coach decides: nothing here acts on its own."
      />
    </div>
  );
}
