-- Split the catch-all ADMIN role into SECRETARY and WELFARE_OFFICER, so the
-- app enforces the per-role visibility the marketing site publishes (a
-- secretary cannot open medical notes; a welfare officer sees no finances).
--
-- Existing ADMIN memberships become SECRETARY rather than being dropped.
-- Postgres can't remove a value from an enum in place, so this rebuilds the
-- type and recasts the column.

-- 1. New enum with the final set of values.
CREATE TYPE "MembershipRole_new" AS ENUM ('SECRETARY', 'WELFARE_OFFICER', 'TREASURER', 'COACH', 'GUARDIAN');

-- 2. Recast Membership.role, mapping ADMIN -> SECRETARY.
ALTER TABLE "Membership"
  ALTER COLUMN "role" TYPE "MembershipRole_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'SECRETARY'
      ELSE "role"::text
    END
  )::"MembershipRole_new";

-- 3. Recast Document.visibility (an array of the same enum), same mapping.
-- array_replace over text[] rather than a subquery: Postgres rejects
-- subqueries inside an ALTER COLUMN ... USING transform expression.
ALTER TABLE "Document"
  ALTER COLUMN "visibility" TYPE "MembershipRole_new"[]
  USING array_replace("visibility"::text[], 'ADMIN', 'SECRETARY')::"MembershipRole_new"[];

-- 4. Swap the types.
DROP TYPE "MembershipRole";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";
