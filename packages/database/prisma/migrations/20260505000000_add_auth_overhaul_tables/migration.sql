-- TT-118: auth overhaul mirror — adds the same auth schema the platform
-- (two-trees-digital-new) uses, brought into turbo-temp so newly-provisioned
-- apps inherit it out of the box.
--
-- This is a single-shot migration since turbo-temp's DBs are fresh per app
-- (no historical data to migrate). The platform's equivalent migrations
-- needed careful CASE/USING + backfill — none of that complexity here.
--
-- What's added:
--   1. AuthProvider enum
--   2. User.authProvider converted from text to AuthProvider enum
--   3. Role.superAdmin column
--   4. UserActivity table (audit log)
--   5. Account / Session / VerificationToken (NextAuth Prisma adapter)
--   6. PasswordResetToken (forgot/reset-password flow)

-- 1. Create the AuthProvider enum
CREATE TYPE "AuthProvider" AS ENUM ('credentials', 'google', 'github', 'email');

-- 2. Convert User.authProvider from text to the enum.
--    Fresh DB so no values to preserve, but using ALTER TYPE in case any
--    bootstrap seed has populated rows.
ALTER TABLE "User"
  ALTER COLUMN "authProvider" TYPE "AuthProvider"
  USING (
    CASE
      WHEN "authProvider" = 'google'      THEN 'google'::"AuthProvider"
      WHEN "authProvider" = 'github'      THEN 'github'::"AuthProvider"
      WHEN "authProvider" = 'email'       THEN 'email'::"AuthProvider"
      WHEN "authProvider" = 'credentials' THEN 'credentials'::"AuthProvider"
      WHEN "authProvider" IS NULL         THEN NULL
      ELSE 'credentials'::"AuthProvider"
    END
  );

-- 3. Add Role.superAdmin
ALTER TABLE "Role" ADD COLUMN "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- 4. UserActivity (audit + activity log)
CREATE TABLE "UserActivity" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "event"     TEXT         NOT NULL,
  "metadata"  JSONB        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserActivity_userId_createdAt_idx" ON "UserActivity" ("userId", "createdAt");
CREATE INDEX "UserActivity_event_idx"             ON "UserActivity" ("event");
ALTER TABLE "UserActivity"
  ADD CONSTRAINT "UserActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Account (NextAuth Prisma adapter)
CREATE TABLE "Account" (
  "id"                TEXT         NOT NULL,
  "userId"            TEXT         NOT NULL,
  "type"              TEXT         NOT NULL,
  "provider"          TEXT         NOT NULL,
  "providerAccountId" TEXT         NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key"
  ON "Account" ("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account" ("userId");
ALTER TABLE "Account"
  ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Session (NextAuth Prisma adapter — empty under JWT strategy, kept for future flip)
CREATE TABLE "Session" (
  "id"           TEXT         NOT NULL,
  "sessionToken" TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "expires"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session" ("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session" ("userId");
ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. VerificationToken (NextAuth EmailProvider — magic-link flow, future use)
CREATE TABLE "VerificationToken" (
  "identifier" TEXT         NOT NULL,
  "token"      TEXT         NOT NULL,
  "expires"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "VerificationToken_token_key"
  ON "VerificationToken" ("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key"
  ON "VerificationToken" ("identifier", "token");

-- 8. PasswordResetToken (forgot-password / reset-password flow)
CREATE TABLE "PasswordResetToken" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "token"     TEXT         NOT NULL,
  "expires"   TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_token_key"
  ON "PasswordResetToken" ("token");
CREATE INDEX "PasswordResetToken_userId_idx"  ON "PasswordResetToken" ("userId");
CREATE INDEX "PasswordResetToken_expires_idx" ON "PasswordResetToken" ("expires");
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
