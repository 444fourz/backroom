"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copies the names of everyone who hasn't responded yet — the stand-in for a push/SMS nudge. */
export function NudgeButton({ names }: { names: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        const text = `Still waiting on availability for: ${names.join(", ")}`;
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this reminder:", text);
        }
      }}
    >
      {copied ? "Copied" : `Nudge the ${names.length} who haven't replied`}
    </Button>
  );
}
