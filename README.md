# ClubCore

Club management platform for grassroots sports clubs — this is the first-draft
scaffold of the product app (not the marketing site). See
`C:\Users\nayee\.claude\plans\logical-doodling-puppy.md` for the design plan.

Breadth over depth: every module below has a real, role-scoped, seeded shell.
Two things are wired up fully end to end as a template for the rest: creating
a fixture, and a guardian responding to an availability request.

## Stack

Next.js 16 (App Router) + TypeScript · PostgreSQL + Prisma 7 · Auth.js v4
(Credentials provider, JWT sessions) · Tailwind + shadcn/ui · Zod

## Getting started

Prerequisites: Node 20+, Docker Desktop running.

```bash
npm install
docker compose up -d          # starts local Postgres
npx prisma migrate dev        # applies the schema
npx prisma db seed            # seeds one demo club with every role
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

## Seeded accounts

Every seeded user shares the same dev password: `clubcore-dev-2026` (see
`SEED_USER_PASSWORD` in `.env`).

| Role | Email |
|---|---|
| Admin | admin@clubcore.dev |
| Treasurer | treasurer@clubcore.dev |
| Coach (Under 10s) | coach.u10@clubcore.dev |
| Coach (Under 12s) | coach.u12@clubcore.dev |
| Guardian | guardian1@clubcore.dev … guardian8@clubcore.dev |

Log in as different roles to see the role-based access control boundaries —
e.g. a treasurer is redirected away from `/safeguarding` and `/players`, a
coach only ever sees their own team, and a guardian only ever sees their own
children.

## How access control works

Every route and every database query is scoped by the caller's **active
membership** (which club/team/role they're currently acting as), never by a
bare user id:

- `src/lib/permissions/policies.ts` — the single source of truth for which
  role has which capability (e.g. `medical:view`, `payment:manage`).
- `src/lib/permissions/guard.ts` — route guards; redirect to `/unauthorized`
  if the caller lacks the capability.
- `src/lib/data/*.ts` — the data-access layer. This is where the boundary
  actually holds: a query built for a treasurer never `select`s medical or
  credential fields in the first place, so a bug in a page component can't
  leak them.

## Known rough edges (first draft, by design)

- Payment processing, calendar export, DBS expiry emails, document uploads,
  and member invites are data-modeled but not wired up — see the plan's
  "Explicit Deferrals" section.
- `middleware.ts` uses the deprecated-but-still-supported convention; Next.js
  16 prefers `proxy.ts` (`npx @next/codemod@canary middleware-to-proxy .` to
  migrate once the repo is under git).
