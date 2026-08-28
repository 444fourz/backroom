-- Per-club opt-in: lets the welfare officer see a family is in arrears
-- (yes/no only, never a figure). Off by default.
ALTER TABLE "Club" ADD COLUMN "showArrearsToWelfare" BOOLEAN NOT NULL DEFAULT false;
