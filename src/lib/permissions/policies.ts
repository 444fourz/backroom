import type { MembershipRole } from "@prisma/client";

/**
 * Fine-grained capabilities, not roles. Every route guard and every
 * data-access function checks one of these, never a role name directly —
 * that's what keeps "what a treasurer can see" defined in exactly one place.
 *
 * Capabilities do not encode *scope* (which club/team/family). Scope comes
 * from the caller's active Membership (see lib/auth/session.ts) and is
 * applied by the data-access layer (lib/data/*.ts), e.g. a coach's
 * `event:create` is always constrained to their own teamId server-side.
 *
 * The role split below is a published promise, not an internal preference:
 * the marketing site's safeguarding page tells welfare officers, in a
 * per-role table, exactly what each role can and cannot open. Changing any
 * of these sets means that page becomes untrue — update both together.
 */
export type Capability =
  | "dashboard:view"
  | "event:view"
  | "event:create"
  | "availability:respond"
  | "attendance:record"
  | "matchstat:record"
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
  | "credential:status:view"
  | "document:view"
  | "document:manage"
  | "club:manage"
  | "coaching:view";

export const ROLE_CAPABILITIES: Record<MembershipRole, Capability[]> = {
  // "Sees registration, consent and documents; full contact details; whether
  // a coach's DBS is in date. Does not see: the DBS document itself, medical
  // notes, financial detail."
  SECRETARY: [
    "dashboard:view",
    "event:view",
    "event:create",
    "attendance:record",
    "matchstat:record",
    "registration:view:all",
    "player:view:team",
    "credential:status:view", // expiry status only — NOT the document
    "document:view",
    "document:manage",
    "club:manage",
    "coaching:view",
    // Deliberately excluded: medical:view, payment:*, credential:view:club.
    // The secretary runs the club's admin; they do not open medical notes
    // and they do not see money.
  ],
  // "Full safeguarding and medical visibility across every team; consent
  // records and safeguarding contacts. Does not see: financial detail of any
  // kind."
  WELFARE_OFFICER: [
    "dashboard:view",
    "event:view",
    "registration:view:all",
    "player:view:team",
    "medical:view",
    "credential:view:club",
    "credential:view:own",
    "credential:status:view",
    "document:view",
    // Deliberately excluded: payment:* (no financial detail of any kind),
    // club:manage, event:create.
  ],
  // "Sees names and the family responsible for payment; subscriptions,
  // payments and arrears across every team. Does not see: medical data,
  // safeguarding documents, consent records."
  TREASURER: [
    "dashboard:view",
    "event:view",
    "payment:view:all",
    "payment:manage",
    "document:view",
    // Deliberately excluded: medical:view, credential:view:*,
    // registration:view:all (consent records), player:view:team.
    // A treasurer's queries fetch only what invoicing needs — a player's
    // name, not their medical or consent record.
  ],
  // "Sees their assigned teams only; names, emergency contacts, and the
  // medical information needed at the side of a pitch. Does not see:
  // safeguarding documents or consent paperwork, anything about another
  // coach's team, any financial detail."
  COACH: [
    "dashboard:view",
    "event:view",
    "event:create",
    "availability:respond",
    "attendance:record",
    "matchstat:record",
    "player:view:team",
    "medical:view",
    "credential:view:own",
    "document:view",
    "coaching:view",
    // Deliberately excluded: credential:view:club (their own record only),
    // registration:view:all (consent paperwork), payment:*, club:manage.
  ],
  // "Sees their own children only: that child's schedule, payments and
  // record. Does not see: anything about another family, ever."
  GUARDIAN: [
    "dashboard:view",
    "event:view",
    "availability:respond",
    "payment:view:own",
    "registration:view:own",
    "player:view:own",
    "document:view",
    // Deliberately excluded: attendance:record, medical:view (their own
    // children's medical data comes via player:view:own, not this),
    // credential:view:*, club:manage.
  ],
};

export function roleHasCapability(role: MembershipRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/** Human-readable role name, e.g. WELFARE_OFFICER -> "Welfare officer". */
export function roleLabel(role: MembershipRole): string {
  const lower = role.toLowerCase().replaceAll("_", " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Which role owns each capability, and whether being refused it is a
 * *deliberate, permanent* boundary or simply a role you haven't been given.
 *
 * This distinction matters: telling a secretary that a medical-notes block
 * is fixable by "asking an admin" would contradict the safeguarding promise
 * the marketing site makes to welfare officers. Some doors are meant to
 * stay shut for everyone but their owner.
 */
export const CAPABILITY_OWNER: Partial<
  Record<Capability, { owner: MembershipRole; area: string; deliberate: boolean }>
> = {
  "payment:view:all": { owner: "TREASURER", area: "Payments and arrears", deliberate: true },
  "payment:manage": { owner: "TREASURER", area: "Payments and arrears", deliberate: true },
  "medical:view": { owner: "WELFARE_OFFICER", area: "Medical notes", deliberate: true },
  "credential:view:club": {
    owner: "WELFARE_OFFICER",
    area: "Safeguarding records",
    deliberate: true,
  },
  "registration:view:all": {
    owner: "SECRETARY",
    area: "Registration and consent",
    deliberate: true,
  },
  "club:manage": { owner: "SECRETARY", area: "Club settings", deliberate: false },
  "document:manage": { owner: "SECRETARY", area: "Club documents", deliberate: false },
  "event:create": { owner: "COACH", area: "Creating fixtures", deliberate: false },
  "attendance:record": { owner: "COACH", area: "Recording attendance", deliberate: false },
  "matchstat:record": { owner: "COACH", area: "Recording match stats", deliberate: false },
};

/** The role that assigns everyone else's role — per the site, the secretary. */
export const ROLE_ADMINISTRATOR: MembershipRole = "SECRETARY";
