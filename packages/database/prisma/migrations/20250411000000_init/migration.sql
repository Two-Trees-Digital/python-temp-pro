-- Baseline migration — represents the initial schema for all tables.
--
-- For brand-new projects cloned from turbo-temp:
--   Run `prisma migrate dev` locally to create/update migrations.
--   Vercel runs `prisma migrate deploy` on every build to apply pending migrations.
--
-- For existing databases (non-empty Neon projects):
--   Mark this as already applied so Prisma doesn't try to re-create tables:
--   cd packages/database
--   pnpm db:resolve --applied 20250411000000_init

CREATE TABLE "Role" (
    "id"        TEXT      NOT NULL,
    "name"      TEXT      NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

CREATE TABLE "User" (
    "id"              TEXT      NOT NULL,
    "name"            TEXT      NOT NULL,
    "email"           TEXT      NOT NULL,
    "password"        TEXT,
    "profileImage"    TEXT,
    "authProvider"    TEXT,
    "isEmailVerified" BOOLEAN,
    "roleId"          TEXT      NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "deletedAt"       TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_id_email_idx" ON "User"("id", "email");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Todo" (
    "id"          TEXT    NOT NULL,
    "title"       TEXT    NOT NULL,
    "description" TEXT    NOT NULL,
    "isCompleted" BOOLEAN NOT NULL,
    "userId"      TEXT    NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Todo_id_userId_idx" ON "Todo"("id", "userId");

ALTER TABLE "Todo" ADD CONSTRAINT "Todo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
