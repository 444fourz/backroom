# BackRoom

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

Prerequisites: Node 20+, Docker Desktop running. Full walkthrough (including
first-time `.env` setup) is in [`requirements.txt`](./requirements.txt) —
short version, once `.env` exists:

```bash
npm install
docker compose up -d          # starts local Postgres
npx prisma migrate deploy     # applies the schema
npx prisma db seed            # seeds one demo club with every role
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

## Seeded accounts

Every seeded user shares the same dev password: `backroom-dev-2026` (see
`SEED_USER_PASSWORD` in `.env`).

| Role | Email |
|---|---|
| Secretary | secretary@backroom.dev |
| Welfare officer | welfare@backroom.dev |
| Treasurer | treasurer@backroom.dev |
| Coach (Under 10s) | coach.u10@backroom.dev |
| Coach (Under 12s) | coach.u12@backroom.dev |
| Guardian | guardian1@backroom.dev … guardian8@backroom.dev |

`admin@backroom.dev` / password `admin` is a dev-only account that holds
every role above as a separate membership on the same club — use
[/select-club](http://localhost:3000/select-club) to switch between them.
It doesn't bypass the role boundaries below; it just gives one login all
five memberships to switch into instead of five separate logins.

## What each role can see

These boundaries are a published promise, not an internal preference — the
marketing site's safeguarding page shows this table to prospective clubs.
**If you change one, change both.**

| | Secretary | Welfare officer | Treasurer | Coach | Guardian |
|---|---|---|---|---|---|
| Registration & consent | ✅ club-wide | ✅ club-wide | ❌ | ❌ | ✅ own children |
| Medical notes | ❌ | ✅ club-wide | ❌ | ✅ own team | ✅ own children |
| DBS/certificate **status** | ✅ | ✅ | ❌ | ✅ own only | ❌ |
| DBS **certificate itself** | ❌ | ✅ | ❌ | ❌ | ❌ |
| Payments & arrears | ❌ | ❌ | ✅ club-wide | ❌ | ✅ own family |
| Club management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create fixtures | ✅ any team | ❌ | ❌ | ✅ own team | ❌ |

Two boundaries worth understanding, because they're the ones a welfare
officer will ask about:

- **A secretary runs the club but never opens a medical note**, and sees only
  whether a DBS is in date — never the certificate. Both are enforced by the
  query never selecting those fields for that role, not by hiding them in the UI.
- **A welfare officer sees all safeguarding and medical data but no money at
  all** — not even whether a family is in arrears.

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

## Where the app still differs from the marketing site

The site describes a few things that don't exist here yet. Tracked, not forgotten:

- **Self-serve club sign-up and email invites.** The site's onboarding story
  is "secretary invites by email → member downloads app → gets a role". There
  is currently no way to create a club or invite anyone from inside the app;
  clubs only exist via `prisma db seed`.
- **Free / Club / Pro subscription tiers.** Nothing tracks which plan a club is
  on. (Distinct from the `Invoice`/`Payment` models, which are *members paying
  the club*, not *the club paying BackRoom*.)
- **A player login for ages 13+.** Deliberately not built — giving a minor
  their own credentials is a safeguarding decision, not an engineering default.
- **Native iOS/Android apps.** The site says "in review with the app stores";
  this is a web app. PWA first, React Native later.

## Known rough edges (first draft, by design)

- Payment processing, calendar export, DBS expiry emails, document uploads,
  and member invites are data-modeled but not wired up — see the plan's
  "Explicit Deferrals" section.
- `middleware.ts` uses the deprecated-but-still-supported convention; Next.js
  16 prefers `proxy.ts` (`npx @next/codemod@canary middleware-to-proxy .` to
  migrate once the repo is under git).
