-- Per-player, per-match goals/assists. A row's existence is the "appearance"
-- (recorded by a coach or secretary via the fixture detail page).
CREATE TABLE "MatchStat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchStat_eventId_playerId_key" ON "MatchStat"("eventId", "playerId");
CREATE INDEX "MatchStat_playerId_idx" ON "MatchStat"("playerId");
CREATE INDEX "MatchStat_eventId_idx" ON "MatchStat"("eventId");

ALTER TABLE "MatchStat" ADD CONSTRAINT "MatchStat_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchStat" ADD CONSTRAINT "MatchStat_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchStat" ADD CONSTRAINT "MatchStat_recordedByUserId_fkey"
    FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
