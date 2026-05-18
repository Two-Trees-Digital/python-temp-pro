# 20260505000000_add_auth_overhaul_tables

TT-118 — auth overhaul mirror.

Brings turbo-temp's schema in line with the platform (`two-trees-digital-new`) so newly-provisioned apps inherit the full auth foundation: NextAuth Prisma adapter tables, password-reset flow, super-admin tier, audit logging.

## What it adds

1. **`AuthProvider` enum** (`credentials | google | github | email`) — replaces the prior free-form `User.authProvider` string.
2. **`User.authProvider`** converted from `String?` to the enum.
3. **`Role.superAdmin`** boolean (default false) — super-admin tier within the ADMIN role.
4. **`UserActivity`** table — audit + activity log. `packages/auth`'s `safeLogActivity` helper writes to this.
5. **`Account` / `Session` / `VerificationToken`** — canonical NextAuth Prisma adapter tables. Field names use snake_case where the adapter requires it (`refresh_token`, `access_token`, etc.) — don't rename them.
6. **`PasswordResetToken`** — for the forgot-password / reset-password flow. Tokens stored as sha-256 hashes at rest.

## Why a single migration

turbo-temp's DBs are fresh per provisioned app — no historical data to migrate, no row-by-row backfill needed. The platform required four separate migrations spread across TT-114 / TT-115 / TT-121 because of live-data complexity. None of that applies here.

## How to apply

The dashboard's Vercel build runs `prisma migrate deploy` automatically as part of every deploy. New apps' first deploy applies this migration to their fresh Neon DB.

For local dev:

```
cd packages/database
pnpm prisma migrate deploy
```

## How to roll back

See [`down.sql`](./down.sql) — drops all the new tables, reverts `User.authProvider` to text, drops the enum + `Role.superAdmin`. Then `prisma migrate resolve --rolled-back ...` to keep Prisma's bookkeeping consistent.
