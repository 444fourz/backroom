"use client";

import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowAction = {
  label: string;
  /** Rendered inside the dialog this action opens. */
  form?: ReactNode;
  dialogTitle?: string;
  dialogDescription?: string;
  /** Submitted straight away, no dialog. */
  immediateForm?: ReactNode;
  destructive?: boolean;
};

/**
 * The ⋯ menu on a person's row.
 *
 * Deliberately always rendered rather than hover-only: this app is used on
 * phones, where there is no hover, and a hover-only control is also
 * unreachable by keyboard. Hover just raises its contrast on desktop.
 */
export function RowActions({
  label,
  actions,
  disabledReason,
}: {
  label: string;
  actions: RowAction[];
  disabledReason?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  if (disabledReason) {
    return (
      <span className="text-xs text-muted-foreground" title={disabledReason}>
        —
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Manage ${label}`}
            className="text-muted-foreground opacity-70 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action, index) =>
            action.immediateForm ? (
              <div key={action.label} className="px-1 py-0.5">
                {action.immediateForm}
              </div>
            ) : (
              <DropdownMenuItem
                key={action.label}
                onSelect={(event) => {
                  event.preventDefault();
                  setOpen(index);
                }}
                className={action.destructive ? "text-destructive" : undefined}
              >
                {action.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {actions.map((action, index) =>
        action.form ? (
          <Dialog
            key={action.label}
            open={open === index}
            onOpenChange={(next) => setOpen(next ? index : null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{action.dialogTitle ?? action.label}</DialogTitle>
                {action.dialogDescription ? (
                  <DialogDescription>{action.dialogDescription}</DialogDescription>
                ) : null}
              </DialogHeader>
              {action.form}
            </DialogContent>
          </Dialog>
        ) : null,
      )}
    </>
  );
}

export { DialogFooter };
