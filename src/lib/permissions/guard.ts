import { redirect } from "next/navigation";

import { getActiveMembership, requireActiveMembership } from "@/lib/auth/session";

import { roleHasCapability, type Capability } from "./policies";

/**
 * Route guard — call at the top of any page/layout that requires a
 * capability. Redirects to /unauthorized rather than merely hiding UI, so
 * the boundary holds even if someone navigates to the URL directly.
 */
export async function requireCapability(capability: Capability) {
  const ctx = await requireActiveMembership();
  if (!roleHasCapability(ctx.active.role, capability)) {
    // Pass the capability along so /unauthorized can name who does own this
    // area, instead of pointing at a generic "admin" who may not exist.
    redirect(`/unauthorized?need=${encodeURIComponent(capability)}`);
  }
  return ctx;
}

/** Like requireCapability, but passes if the caller has ANY of the given capabilities. */
export async function requireAnyCapability(capabilities: Capability[]) {
  const ctx = await requireActiveMembership();
  const allowed = capabilities.some((capability) => roleHasCapability(ctx.active.role, capability));
  if (!allowed) {
    redirect(`/unauthorized?need=${encodeURIComponent(capabilities[0] ?? "")}`);
  }
  return ctx;
}

/**
 * Non-redirecting check for building the nav and for conditionally
 * rendering page sections (e.g. hiding the Medical tab on a player profile).
 * Uses the same ROLE_CAPABILITIES map as requireCapability, so nav
 * visibility and route access can never drift apart.
 */
export async function can(capability: Capability): Promise<boolean> {
  const { active } = await getActiveMembership();
  if (!active) return false;
  return roleHasCapability(active.role, capability);
}

export async function canAny(capabilities: Capability[]): Promise<boolean> {
  const { active } = await getActiveMembership();
  if (!active) return false;
  return capabilities.some((c) => roleHasCapability(active.role, c));
}
