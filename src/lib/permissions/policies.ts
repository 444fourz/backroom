import type { MembershipRole } from "@prisma/client";

/**
 * Fine-grained capabilities, not roles. Every route guard and every
 * data-access function checks one of these, never a role name directly —
 * that's what keeps "what treasurer can see" defined in exactly one place.
 *
 * Capabilities do not encode *scope* (which club/team/family). Scope comes
 * from the caller's active Membership (see lib/auth/session.ts) and is
 * applied by the data-access layer (lib/data/*.ts), e.g. a coach's
 * `event:create` is always constrained to their own teamId server-side.
 */
export type Capability =
  | "dashboard:view"
  | "event:view"
  | "event:create"
  | "availability:respond"
  | "attendance:record"
  | "payment:view:all"
  | "payment:view:own"
  | "payment:manage"
  | "registration:view:all"
  | "registration:view:own"
  | "player:view:team"
  | "player:view:own"
  | "medical:view"
  | "credential:view:club"
  | "credential:view:own"
  | "document:view"
  | "document:manage"
  | "club:manage"
  | "coaching:view";

export const ROLE_CAPABILITIES: Record<MembershipRole, Capability[]> = {
  ADMIN: [
    "dashboard:view",
    "event:view",
    "event:create",
    "availability:respond",
    "attendance:record",
    "payment:view:all",
    "payment:manage",
    "registration:view:all",
    "player:view:team",
    "medical:view",
    "credential:view:club",
    "credential:view:own",
    "document:view",
    "document:manage",
    "club:manage",
    "coaching:view",
  ],
  TREASURER: [
    "dashboard:view",
    "event:view",
    "payment:view:all",
    "payment:manage",
    "document:view",
    // Deliberately excluded: medical:view, credential:view:*, player:view:team.
    // A treasurer's data-access queries fetch only what invoicing needs
    // (player name, not medical/credential records).
  ],
  COACH: [
    "dashboard:view",
    "event:view",
    "event:create",
    "availability:respond",
    "attendance:record",
    "player:view:team",
    "medical:view",
    "credential:view:own",
    "document:view",
    "coaching:view",
    // Deliberately excluded: credential:view:club (only their own record,
    // not the whole club's), payment:*, club:manage.
  ],
  GUARDIAN: [
    "dashboard:view",
    "event:view",
    "availability:respond",
    "payment:view:own",
    "registration:view:own",
    "player:view:own",
    "document:view",
    // Deliberately excluded: attendance:record, medical:view (beyond their
    // own children via player:view:own), credential:view:*, club:manage.
  ],
};

export function roleHasCapability(role: MembershipRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}
