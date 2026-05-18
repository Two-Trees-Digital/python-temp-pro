-- TT-118 manual rollback. Drops everything this migration adds.
-- Run from psql against the affected database if the migration causes
-- problems and you need to back it out without restoring from a backup.
--
-- Step 9 below re-syncs Prisma's bookkeeping. Skip it if you also intend
-- to re-apply the migration once you've fixed forward.

-- 1. Drop new tables (CASCADE handles FKs and indexes)
DROP TABLE IF EXISTS "PasswordResetToken" CASCADE;
DROP TABLE IF EXISTS "VerificationToken"  CASCADE;
DROP TABLE IF EXISTS "Session"            CASCADE;
DROP TABLE IF EXISTS "Account"            CASCADE;
DROP TABLE IF EXISTS "UserActivity"       CASCADE;

-- 2. Revert User.authProvider to text (loses type constraint, preserves values)
ALTER TABLE "User"
  ALTER COLUMN "authProvider" TYPE TEXT
  USING ("authProvider"::text);

-- 3. Drop the AuthProvider enum
DROP TYPE IF EXISTS "AuthProvider";

-- 4. Drop Role.superAdmin
ALTER TABLE "Role" DROP COLUMN IF EXISTS "superAdmin";

-- 5. Tell Prisma the migration was rolled back so future `prisma migrate
--    deploy` runs don't try to re-apply it. From the repo root:
--
--      pnpm --filter database exec prisma migrate resolve \
--        --rolled-back 20260505000000_add_auth_overhaul_tables
