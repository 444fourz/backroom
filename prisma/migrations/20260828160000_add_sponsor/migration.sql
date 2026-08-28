-- Club sponsors shown on the club overview page. Deliberately minimal —
-- name and an optional link, no logo upload, no tiers.
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sponsor_clubId_idx" ON "Sponsor"("clubId");

ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
