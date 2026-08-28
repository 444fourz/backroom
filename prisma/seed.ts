import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "clubcore-dev-2026";

const CLUB_SLUG = "aston-rovers-fc";
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS);
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // --- Club, season, teams (natural-key upserts — safe to re-run) ---
  // showArrearsToWelfare is on here so the demo club shows the feature
  // working end-to-end; a real club starts with it off until the secretary
  // turns it on from /club.
  const club = await prisma.club.upsert({
    where: { slug: CLUB_SLUG },
    update: { showArrearsToWelfare: true },
    create: { name: "Aston Rovers FC", slug: CLUB_SLUG, sport: "FOOTBALL", showArrearsToWelfare: true },
  });

  const season = await prisma.season.upsert({
    where: { clubId_label: { clubId: club.id, label: "2025/26" } },
    update: {},
    create: {
      clubId: club.id,
      label: "2025/26",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-05-31"),
      isActive: true,
    },
  });

  const u10 = await prisma.team.upsert({
    where: { clubId_name: { clubId: club.id, name: "Under 10s" } },
    update: {},
    create: { clubId: club.id, name: "Under 10s", ageGroup: "U10" },
  });

  const u12 = await prisma.team.upsert({
    where: { clubId_name: { clubId: club.id, name: "Under 12s" } },
    update: {},
    create: { clubId: club.id, name: "Under 12s", ageGroup: "U12" },
  });

  // --- Users (natural-key upserts on email) ---
  async function upsertUser(email: string, name: string) {
    return prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name, passwordHash },
    });
  }

  const secretary = await upsertUser("secretary@clubcore.dev", "Priya Secretary");
  const welfare = await upsertUser("welfare@clubcore.dev", "Wendy Welfare");
  const treasurer = await upsertUser("treasurer@clubcore.dev", "Tom Treasurer");
  const coachU10 = await upsertUser("coach.u10@clubcore.dev", "Chris Coach");
  const coachU12 = await upsertUser("coach.u12@clubcore.dev", "Cara Coach");

  // Dev-only superuser: not a real role, just this one account holding every
  // membership at once so someone testing locally can switch (via
  // /select-club) into any role's view without five separate logins. Uses
  // its own password ("admin") rather than SEED_PASSWORD so it's obviously
  // a throwaway dev credential, not a template for a real account.
  const adminPasswordHash = await bcrypt.hash("admin", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clubcore.dev" },
    update: { name: "Dev Admin", passwordHash: adminPasswordHash },
    create: { email: "admin@clubcore.dev", name: "Dev Admin", passwordHash: adminPasswordHash },
  });

  const guardianNames = [
    ["guardian1@clubcore.dev", "Gail Guardian"],
    ["guardian2@clubcore.dev", "Greg Guardian"],
    ["guardian3@clubcore.dev", "Gemma Guardian"],
    ["guardian4@clubcore.dev", "Gary Guardian"],
    ["guardian5@clubcore.dev", "Gina Guardian"],
    ["guardian6@clubcore.dev", "Glenn Guardian"],
    ["guardian7@clubcore.dev", "Grace Guardian"],
    ["guardian8@clubcore.dev", "George Guardian"],
  ] as const;
  const guardians = await Promise.all(guardianNames.map(([email, name]) => upsertUser(email, name)));

  // --- Memberships. Prisma's compound-unique `where` input rejects `null`
  // for a nullable key part (teamId), so upsert() can't target this
  // constraint directly when teamId is null — find-then-create instead. ---
  async function upsertMembership(
    userId: string,
    role: "SECRETARY" | "WELFARE_OFFICER" | "TREASURER" | "COACH" | "GUARDIAN",
    teamId: string | null,
  ) {
    const existing = await prisma.membership.findFirst({ where: { userId, clubId: club.id, teamId, role } });
    if (existing) return existing;
    return prisma.membership.create({ data: { userId, clubId: club.id, teamId, role } });
  }

  await upsertMembership(secretary.id, "SECRETARY", null);
  await upsertMembership(welfare.id, "WELFARE_OFFICER", null);
  await upsertMembership(treasurer.id, "TREASURER", null);
  await upsertMembership(coachU10.id, "COACH", u10.id);
  await upsertMembership(coachU12.id, "COACH", u12.id);
  for (const guardian of guardians) {
    await upsertMembership(guardian.id, "GUARDIAN", null);
  }

  // Admin holds every role as a separate Membership row — each still scoped
  // and audited exactly like a real one — so no single request context
  // silently sees everything; switching roles still goes through
  // /select-club like it would for any other multi-role user.
  await upsertMembership(admin.id, "SECRETARY", null);
  await upsertMembership(admin.id, "WELFARE_OFFICER", null);
  await upsertMembership(admin.id, "TREASURER", null);
  await upsertMembership(admin.id, "COACH", u10.id);
  await upsertMembership(admin.id, "GUARDIAN", null);

  // --- Everything below doesn't have a natural unique key to upsert on, so
  // we reset this club's data for these tables and recreate it fresh. Safe
  // for a dev seed; not the pattern you'd use once real data exists. ---
  await prisma.attendance.deleteMany({ where: { event: { clubId: club.id } } });
  await prisma.matchStat.deleteMany({ where: { event: { clubId: club.id } } });
  await prisma.availabilityResponse.deleteMany({ where: { event: { clubId: club.id } } });
  await prisma.event.deleteMany({ where: { clubId: club.id } });
  await prisma.payment.deleteMany({ where: { invoice: { clubId: club.id } } });
  await prisma.invoice.deleteMany({ where: { clubId: club.id } });
  await prisma.consent.deleteMany({ where: { player: { clubId: club.id } } });
  await prisma.registrationForm.deleteMany({ where: { player: { clubId: club.id } } });
  await prisma.credential.deleteMany({ where: { clubId: club.id } });
  await prisma.document.deleteMany({ where: { clubId: club.id } });
  await prisma.playerMedicalInfo.deleteMany({ where: { player: { clubId: club.id } } });
  await prisma.guardianPlayer.deleteMany({ where: { player: { clubId: club.id } } });
  await prisma.player.deleteMany({ where: { clubId: club.id } });

  // --- Players (5 per team), each with medical info and 1-2 guardians ---
  const u10Names = [
    ["Alfie", "Baker"],
    ["Bella", "Carter"],
    ["Charlie", "Dean"],
    ["Daisy", "Evans"],
    ["Ethan", "Fox"],
  ] as const;
  const u12Names = [
    ["Freya", "Green"],
    ["George", "Hughes"],
    ["Holly", "Irwin"],
    ["Isaac", "Jones"],
    ["Jess", "Kelly"],
  ] as const;

  async function createPlayer(
    teamId: string,
    [firstName, lastName]: readonly [string, string],
    guardianAssignments: { guardianUserId: string; relationship: string; isPrimaryContact: boolean }[],
  ) {
    const player = await prisma.player.create({
      data: {
        clubId: club.id,
        teamId,
        firstName,
        lastName,
        dateOfBirth: new Date(2015, 3, 12),
        medical: {
          create: {
            allergies: "None known",
            conditions: null,
            emergencyContactName: `Emergency Contact for ${firstName}`,
            emergencyContactPhone: "07700 900000",
          },
        },
        guardians: { create: guardianAssignments },
      },
    });
    return player;
  }

  // One guardian (guardians[0]) has children on both teams, to exercise the
  // many-to-many / multi-team guardian path.
  const u10Players = await Promise.all(
    u10Names.map((name, index) =>
      createPlayer(u10.id, name, [
        { guardianUserId: guardians[index % guardians.length].id, relationship: "Parent", isPrimaryContact: true },
      ]),
    ),
  );

  const u12Players = await Promise.all(
    u12Names.map((name, index) =>
      createPlayer(u12.id, name, [
        {
          guardianUserId: index === 0 ? guardians[0].id : guardians[(index + 3) % guardians.length].id,
          relationship: "Parent",
          isPrimaryContact: true,
        },
      ]),
    ),
  );

  const allPlayers = [...u10Players, ...u12Players];

  // Give the admin's GUARDIAN membership something to actually see — a
  // second guardian link on Alfie Baker — since player:view:own would
  // otherwise return an empty list for that role.
  await prisma.guardianPlayer.create({
    data: {
      guardianUserId: admin.id,
      playerId: u10Players[0].id,
      relationship: "Parent",
      isPrimaryContact: false,
    },
  });

  // --- Events: 2 past training per team, 1 upcoming match, 1 recurring weekly training ---
  async function createPastTraining(teamId: string, daysAgo: number) {
    return prisma.event.create({
      data: {
        clubId: club.id,
        teamId,
        type: "TRAINING",
        title: "Weekly training",
        venueName: "Aston Rovers Training Ground",
        startTime: daysFromNow(-daysAgo),
        endTime: daysFromNow(-daysAgo),
        createdByUserId: secretary.id,
      },
    });
  }

  const u10PastA = await createPastTraining(u10.id, 14);
  const u10PastB = await createPastTraining(u10.id, 7);
  const u12PastA = await createPastTraining(u12.id, 14);
  const u12PastB = await createPastTraining(u12.id, 7);

  // A past match with recorded stats, so /stats has something to show and
  // the fixture detail page demonstrates the "already recorded" state, not
  // just the empty entry form.
  const u10PastMatch = await prisma.event.create({
    data: {
      clubId: club.id,
      teamId: u10.id,
      type: "MATCH",
      title: "vs Solihull Saints",
      opponent: "Solihull Saints",
      venueName: "Aston Rovers Ground",
      startTime: daysFromNow(-10),
      kitColour: "Home red",
      createdByUserId: coachU10.id,
    },
  });
  const u10MatchStatLines = [
    { goals: 2, assists: 1 },
    { goals: 1, assists: 0 },
    { goals: 0, assists: 2 },
    { goals: 0, assists: 0 },
    { goals: 1, assists: 1 },
  ] as const;
  for (const [index, player] of u10Players.entries()) {
    const line = u10MatchStatLines[index % u10MatchStatLines.length];
    await prisma.matchStat.create({
      data: {
        eventId: u10PastMatch.id,
        playerId: player.id,
        goals: line.goals,
        assists: line.assists,
        recordedByUserId: coachU10.id,
      },
    });
  }

  const upcomingMatch = await prisma.event.create({
    data: {
      clubId: club.id,
      teamId: u10.id,
      type: "MATCH",
      title: "vs Kings Heath Colts",
      opponent: "Kings Heath Colts",
      venueName: "Aston Rovers Ground",
      venueAddress: "1 Rovers Way, Birmingham",
      venueMapUrl: "https://maps.example.com/aston-rovers-ground",
      meetTime: daysFromNow(6.9),
      startTime: daysFromNow(7),
      kitColour: "Home red",
      createdByUserId: coachU10.id,
    },
  });

  await prisma.event.create({
    data: {
      clubId: club.id,
      teamId: u12.id,
      type: "TRAINING",
      title: "Weekly training",
      venueName: "Aston Rovers Training Ground",
      startTime: daysFromNow(3),
      isRecurring: true,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=TU",
      createdByUserId: coachU12.id,
    },
  });

  // --- Availability responses for the upcoming match (mixed) ---
  const availabilityStatuses = ["AVAILABLE", "AVAILABLE", "UNAVAILABLE", "MAYBE", "NO_RESPONSE"] as const;
  for (const [index, player] of u10Players.entries()) {
    const status = availabilityStatuses[index % availabilityStatuses.length];
    await prisma.availabilityResponse.create({
      data: {
        eventId: upcomingMatch.id,
        playerId: player.id,
        status,
        respondedAt: status === "NO_RESPONSE" ? null : new Date(),
      },
    });
  }

  // --- Attendance for past sessions (mixed) ---
  const attendanceStatuses = ["PRESENT", "PRESENT", "ABSENT", "LATE", "PRESENT"] as const;
  for (const event of [u10PastA, u10PastB]) {
    for (const [index, player] of u10Players.entries()) {
      await prisma.attendance.create({
        data: {
          eventId: event.id,
          playerId: player.id,
          status: attendanceStatuses[index % attendanceStatuses.length],
          recordedByUserId: coachU10.id,
        },
      });
    }
  }
  for (const event of [u12PastA, u12PastB]) {
    for (const [index, player] of u12Players.entries()) {
      await prisma.attendance.create({
        data: {
          eventId: event.id,
          playerId: player.id,
          status: attendanceStatuses[(index + 1) % attendanceStatuses.length],
          recordedByUserId: coachU12.id,
        },
      });
    }
  }

  // --- Invoices: one subs invoice per player (mixed) + one match-fee example ---
  const invoiceStatuses = ["PAID", "PENDING", "OVERDUE", "PAID", "PARTIAL"] as const;
  for (const [index, player] of allPlayers.entries()) {
    const status = invoiceStatuses[index % invoiceStatuses.length];
    const invoice = await prisma.invoice.create({
      data: {
        clubId: club.id,
        playerId: player.id,
        seasonId: season.id,
        type: "SUBS",
        description: "2025/26 season subs",
        amountPence: 12000,
        dueDate: daysFromNow(status === "OVERDUE" ? -10 : 20),
        status,
      },
    });
    if (status === "PAID" || status === "PARTIAL") {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amountPence: status === "PARTIAL" ? 6000 : 12000,
          method: "BANK_TRANSFER",
          recordedByUserId: treasurer.id,
        },
      });
    }
  }

  await prisma.invoice.create({
    data: {
      clubId: club.id,
      playerId: u10Players[0].id,
      seasonId: season.id,
      type: "MATCH_FEE",
      description: "vs Kings Heath Colts — match fee",
      amountPence: 400,
      dueDate: daysFromNow(7),
      status: "PENDING",
    },
  });

  // --- Registration & consent (mixed) ---
  const registrationStatuses = ["COMPLETE", "IN_PROGRESS", "NOT_STARTED"] as const;
  for (const [index, player] of allPlayers.entries()) {
    const status = registrationStatuses[index % registrationStatuses.length];
    await prisma.registrationForm.create({
      data: {
        playerId: player.id,
        seasonId: season.id,
        status,
        submittedAt: status === "COMPLETE" ? new Date() : null,
      },
    });

    if (status !== "NOT_STARTED") {
      const guardianLink = await prisma.guardianPlayer.findFirst({ where: { playerId: player.id } });
      for (const type of ["PHOTO", "MEDICAL_TREATMENT", "CODE_OF_CONDUCT"] as const) {
        await prisma.consent.create({
          data: {
            playerId: player.id,
            seasonId: season.id,
            type,
            granted: true,
            grantedByUserId: guardianLink?.guardianUserId ?? secretary.id,
            policyVersion: "2025-1",
          },
        });
      }
    }
  }

  // --- Credentials: DBS for both coaches (one valid, one expiring soon) + First Aid ---
  await prisma.credential.create({
    data: {
      userId: coachU10.id,
      clubId: club.id,
      type: "DBS",
      referenceNumber: "DBS-001-2024",
      issueDate: new Date("2024-01-15"),
      expiryDate: daysFromNow(400),
    },
  });
  await prisma.credential.create({
    data: {
      userId: coachU10.id,
      clubId: club.id,
      type: "FIRST_AID",
      issueDate: new Date("2024-06-01"),
      expiryDate: daysFromNow(200),
    },
  });
  await prisma.credential.create({
    data: {
      userId: coachU12.id,
      clubId: club.id,
      type: "DBS",
      referenceNumber: "DBS-002-2023",
      issueDate: new Date("2023-05-10"),
      expiryDate: daysFromNow(18), // deliberately expiring soon
    },
  });
  await prisma.credential.create({
    data: {
      userId: coachU12.id,
      clubId: club.id,
      type: "FIRST_AID",
      issueDate: new Date("2024-03-01"),
      expiryDate: daysFromNow(300),
    },
  });

  // --- Documents (placeholders) ---
  await prisma.document.create({
    data: {
      clubId: club.id,
      uploadedByUserId: secretary.id,
      title: "Code of Conduct.pdf",
      category: "POLICY",
      fileUrl: "https://example.com/documents/code-of-conduct.pdf",
      visibility: ["SECRETARY", "WELFARE_OFFICER", "TREASURER", "COACH", "GUARDIAN"],
    },
  });
  await prisma.document.create({
    data: {
      clubId: club.id,
      uploadedByUserId: secretary.id,
      title: "Photo Consent Policy.pdf",
      category: "CONSENT_FORM",
      fileUrl: "https://example.com/documents/photo-consent-policy.pdf",
      visibility: ["SECRETARY", "WELFARE_OFFICER", "GUARDIAN"],
    },
  });

  // A DBS certificate attached to a coach's record, so the "secretary sees
  // the expiry date but never the certificate" boundary is exercised by the
  // seed data rather than only being true in theory.
  const dbsProof = await prisma.document.create({
    data: {
      clubId: club.id,
      uploadedByUserId: welfare.id,
      title: "DBS Certificate — Chris Coach.pdf",
      category: "CREDENTIAL_PROOF",
      fileUrl: "https://example.com/documents/dbs-chris-coach.pdf",
      visibility: ["WELFARE_OFFICER"],
    },
  });
  await prisma.credential.updateMany({
    where: { clubId: club.id, userId: coachU10.id, type: "DBS" },
    data: { documentId: dbsProof.id },
  });

  console.log("Seed complete.");
  console.log(`  Club: ${club.name} (${club.slug})`);
  console.log(`  Dev login password for every seeded user: ${SEED_PASSWORD}`);
  console.log(`  Admin (all roles, password "admin"): ${admin.email}`);
  console.log(`  Secretary:  ${secretary.email}`);
  console.log(`  Welfare:    ${welfare.email}`);
  console.log(`  Treasurer:  ${treasurer.email}`);
  console.log(`  Coach U10:  ${coachU10.email}`);
  console.log(`  Coach U12:  ${coachU12.email}`);
  console.log(`  Guardians:  ${guardians.map((g) => g.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
