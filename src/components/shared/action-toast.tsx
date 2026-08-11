"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Fires a success toast once when the given search param is present (e.g.
 * after a Server Action redirect to `?created=1`), then strips it from the
 * URL so a refresh doesn't re-fire it. Purely a UX nicety — the redirect
 * itself is already the source of truth that the action succeeded.
 */
export function ActionToast({ param, message }: { param: string; message: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get(param) !== "1") return;

    toast.success(message);

    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${window.location.pathname}?${query}` : window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
