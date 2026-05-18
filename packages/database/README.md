# database — Prisma ORM Package

> **Prisma 5.x** | PostgreSQL | Migrations

Shared Prisma ORM package for the turbo-temp monorepo. Provides the PostgreSQL schema, generated client, migrations, and types used by all apps in the workspace.

---

## Overview

This package wraps Prisma and exposes two entry points so every app in the monorepo can import what it needs:

```typescript
// Prisma client + generated types
import { PrismaClient, User, Role, Todo } from "database/client";

// Utility helpers (audit logging, etc.)
import { logActivity, type DbClient } from "database";
```

The split exists because `database` (utilities) compiles to JS via `tsc` for Node-native runtime consumers (apps/api on Railway), while `database/client` is a pass-through to the Prisma-generated client at `apps/app/generated/client`. Without the split, Node would try to load the package's `.ts` source at runtime and fail on `export type` syntax. See the `exports` map in `package.json`.

The database provider is **PostgreSQL**. The template includes three core models: User, Role, and Todo. All models support soft deletes via a `deletedAt` field.

---

## How It Works

1. **Schema** lives at `prisma/schema.prisma`
2. **`prisma generate`** outputs the client to `../../apps/app/generated/client`
3. **`index.ts`** re-exports everything from that generated client
4. Other packages and apps import from `"database"` via the workspace dependency

---

## Schema

The schema defines three core models:

### Models

**User** — authenticated users with role-based access:
- UUID primary key, unique email
- Password (hashed), role association
- Relations: Role, Todos
- Soft delete via `deletedAt`

**Role** — RBAC roles (e.g., ADMIN, USER):
- Unique name
- Relations: Users
- Soft delete via `deletedAt`

**Todo** — personal to-do items linked to a User:
- Title, description, completion flag
- Relation: User
- Soft delete via `deletedAt`

All three models use soft deletes and have `createdAt`/`updatedAt` timestamps.

---

## Environment Variables

Both variables are **required**. Set them in the root `.env`:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled). | `postgresql://user:pass@host:5432/dbname` |
| `DIRECT_URL` | PostgreSQL direct connection. Used by Prisma CLI for migrations. | `postgresql://user:pass@host:5432/dbname` |

**CRITICAL**: Prisma CLI does **not** read `.env.local` files. Always ensure both variables are in the root `.env`.

---

## Scripts

All scripts are defined in `package.json`:

| Script | Command | Description |
|---|---|---|
| `build` | `prisma generate` | Generates the Prisma client (used by turbo `build` pipeline) |
| `db:generate` | `prisma generate` | Generates the Prisma client |
| `db:migrate` | `prisma migrate dev` | Creates and applies a new migration |
| `db:deploy` | `prisma migrate deploy` | Applies pending migrations (production/CI) |
| `db:push` | `prisma db push` | Pushes schema changes directly (prototyping only, not for production) |

### Running from repo root

```bash
# Generate client
pnpm db:generate

# Create a new migration
pnpm db:migrate

# Deploy migrations in production
pnpm db:deploy

# Check migration status
pnpm db:status
```

---

## Migrations

Migrations live in `prisma/migrations/`. Each migration is a timestamped directory containing a `migration.sql` file.

### Creating a new migration

```bash
# From repo root:
pnpm db:migrate

# Prisma will prompt for a migration name, then:
#   1. Generate a .sql file in prisma/migrations/
#   2. Apply it to your database
#   3. Re-generate the Prisma client
```

### Applying migrations in production

The dashboard's build script automatically runs migrations before building. To manually apply pending migrations:

```bash
pnpm db:deploy
```

Never use `pnpm db:push` in production — it skips the migration system and leaves no audit trail.

---

## Importing the Client

From any app or package in the monorepo:

```typescript
// Prisma client + types — secondary entry point
import { PrismaClient, User, Role, Todo } from "database/client";

// Create an instance
const prisma = new PrismaClient();

// Query example
const users = await prisma.user.findMany({
  where: { deletedAt: null },
  include: { role: true, todos: true },
});
```

The dashboard uses a singleton pattern in `apps/dashboard/src/lib/db.ts` to avoid creating multiple connections during development.

### Utility helpers

For audit logging or other helpers not tied to the generated client:

```typescript
import { logActivity, type DbClient } from "database";

await logActivity(prisma, { userId, event: "post.published" });
```

---

## Adding a Database Model

To add a new model to the schema:

1. Edit `packages/database/prisma/schema.prisma` and add your model
2. Run `pnpm db:migrate` and name your migration
3. The Prisma client will be regenerated automatically
4. Import and use the model in your apps:

```typescript
import { MyModel } from "database/client";

const items = await prisma.myModel.findMany();
```

---

## Soft Deletes

All models include a `deletedAt DateTime?` field for soft deletes. When querying, always filter:

```typescript
// Get active users (not deleted)
const users = await prisma.user.findMany({
  where: { deletedAt: null },
});

// Get deleted users
const deletedUsers = await prisma.user.findMany({
  where: { deletedAt: { not: null } },
});

// Soft delete
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: new Date() },
});

// Restore
await prisma.user.update({
  where: { id: userId },
  data: { deletedAt: null },
});
```

---

## Generated Client Output

The Prisma generator outputs to:

```
apps/app/generated/client/
```

This directory is gitignored and regenerated during every build. If you see import errors after cloning, run:

```bash
pnpm db:generate
```

---

## Binary Targets

The schema specifies two binary targets for the Prisma query engine:

- **`native`** — matches your local platform
- **`rhel-openssl-3.0.x`** — required for Railway Docker and Vercel deployments

**Why `dashboard#build` has `cache: false`**: Prisma generates platform-specific binary files. If a build is cached from macOS and replayed on Linux, the wrong binary is used. Disabling cache ensures the correct engine is generated for each platform.

---

## Important Notes

1. **DIRECT_URL must be in root .env** — Prisma CLI ignores `.env.local`. Always set both DATABASE_URL and DIRECT_URL in the root `.env`.

2. **Soft deletes are manual** — There's no automatic middleware. Always filter `where: { deletedAt: null }` when querying.

3. **Generated client is gitignored** — The `apps/app/generated/` directory is not committed. It regenerates on every build.

4. **Never use `db:push` in production** — Always use migrations (`db:migrate`, `db:deploy`). Migrations create an audit trail.

---

## File Structure

```
packages/database/
├── index.ts              — Utility helpers (logActivity, DbClient). Compiles to dist/.
├── activityLog.ts        — Audit-log helper, consumed via index.ts.
├── client.js             — CJS shim re-exporting the generated Prisma client (database/client entry).
├── client.d.ts           — Type pass-through for database/client.
├── tsconfig.json         — tsc config; outputs to dist/.
├── package.json          — main/types point at dist/; exports map adds database/client.
├── .npmrc                — Prisma hoisting config.
├── README.md             — This file.
└── prisma/
    ├── schema.prisma     — Database schema definition.
    └── migrations/       — Migration history.
        ├── migration_lock.toml
        └── [timestamped migration directories]/
```

---

## Related Documentation

- **Prisma Documentation** — https://www.prisma.io/docs
- **PostgreSQL Documentation** — https://www.postgresql.org/docs

