"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copies a plain-text summary — the stand-in for sending an email/SMS blast. */
export function CopyMatchDetailsButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy these match details:", text);
        }
      }}
    >
      {copied ? "Copied" : "Copy match details"}
    </Button>
  );
}
