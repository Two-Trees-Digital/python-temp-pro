# turbo-temp — Full-Stack Monorepo Template

> **Two Trees Digital** | Turborepo + pnpm + Next.js 14 + Prisma + BullMQ + Docker

A production-ready full-stack monorepo template for building scalable web applications. Built on **Turborepo**, **pnpm workspaces**, and **Next.js 14**, with first-class support for **Prisma + PostgreSQL**, **BullMQ job queues**, and **Docker-based workers**.

This is a **template repository** designed to be cloned and customized for your own projects. It provides a solid foundation for multi-app architectures with shared packages, database-first design, and automated deployments.

---

## Overview

turbo-temp provides a complete foundation for full-stack development:

- **Monorepo orchestration** — Turborepo + pnpm workspaces with fast, incremental builds
- **Multi-app architecture** — Next.js marketing site, admin dashboard, and scalable worker service
- **Shared packages** — Prisma database ORM, React component library, ESLint/TypeScript configs, email service, generic job queue
- **Production infrastructure** — GitHub Actions, Vercel deployments, Docker workers
- **Extensible design** — Generic queue factory, email templates, and database schema ready to customize
- **Database-first** — Prisma migrations, auto-generated types, soft-delete support

### Key Stats

| Metric | Value |
|--------|-------|
| **Node.js version** | 22.x (LTS) |
| **Package manager** | pnpm 8.9.0 |
| **Primary framework** | Next.js 14 (App Router) |
| **Database** | PostgreSQL + Prisma ORM |
| **Job queue** | BullMQ + Redis |
| **Deployment** | Vercel (frontend), Docker (worker) |
| **CI/CD** | GitHub Actions |

---

## Repository Structure

```
turbo-temp/
├── apps/
│   ├── app/              — Next.js 14 marketing/main site (port 3000)
│   ├── dashboard/        — Next.js 14 admin dashboard (port 3001)
│   └── worker/           — BullMQ job processor (Docker)
│
├── packages/
│   ├── database/         — Prisma ORM + schema (PostgreSQL)
│   ├── queue/            — BullMQ queue factory + Redis client
│   ├── email/            — Resend transactional-email wrapper
│   ├── auth/             — Shared NextAuth config + password-reset helpers
│   ├── env/              — Tiny env-context helpers (isLocal/marketingAppUrl/…)
│   ├── ui/               — Shared React component library
│   ├── eslint-config/    — Shared ESLint presets
│   └── typescript-config/ — Shared tsconfig bases
│
├── .github/
│   └── workflows/
│       └── deploy-vercel.yml — CI/CD pipeline (build → deploy)
│
├── turbo.json            — Turborepo pipeline config + caching
├── pnpm-workspace.yaml   — pnpm workspace definitions
├── package.json          — Root package scripts
├── docker-compose.yaml   — Local dev database/Redis services
└── .env                  — Root environment variables
```

---

## Getting Started

### Prerequisites

- **Node.js** 22.x
- **pnpm** 8.9.0+ (`npm install -g pnpm@8.9.0`)
- **PostgreSQL** database (local or cloud)
- **Redis** instance (local or cloud)
- **Git** for version control

### 1. Clone the Repository

```bash
git clone https://github.com/Two-Trees-Digital/turbo-temp.git your-project
cd your-project
```

### 2. Install Dependencies

```bash
pnpm install
```

pnpm reads `pnpm-workspace.yaml` and installs all workspace packages in a single step.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` at the repo root and fill in values:

```bash
cp .env.example .env
```

The full var reference (with comments on what each one does + where to get
the secret) lives in `.env.example`. The minimum required to run locally:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/db"
DIRECT_URL="postgresql://user:password@host:5432/db"

# Redis (BullMQ)
REDIS_URL="redis://localhost:6379"

# Auth (TT-118) — required
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — enables the Google sign-in button
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — enables the GitHub sign-in button (dashboard only)
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — enables real password-reset emails (dev falls back to console logging)
- `NEXTAUTH_COOKIE_DOMAIN` — set to `.example.com` for SSO across subdomains; leave blank otherwise

### 4. Set Up the Database

Generate the Prisma client and create the database schema:

```bash
pnpm db:generate
pnpm db:push
```

### 5. Start Development

```bash
pnpm dev
```

This concurrently starts:
- **app** on http://localhost:3000 (Next.js marketing site)
- **dashboard** on http://localhost:3001 (Next.js admin dashboard)
- **worker** (BullMQ job processor)

To run specific apps only:

```bash
pnpm dev --filter app --filter dashboard
```

---

## Database

All data lives in PostgreSQL and is accessed through Prisma ORM. The database schema is version-controlled via migrations.

### Schema & Migrations

The schema lives in `packages/database/prisma/schema.prisma`. The template includes three core models:

| Model | Purpose |
|-------|---------|
| **User** | User accounts with email, optional password, and role-based access |
| **Role** | RBAC roles (e.g., ADMIN, USER) |
| **Todo** | Personal to-do items linked to users |

All models support soft deletes via a `deletedAt` field.

### Common Database Commands

Run these from the **repo root**:

```bash
# Generate/regenerate the Prisma client after schema changes
pnpm db:generate

# Create a new migration after editing schema.prisma
pnpm db:migrate
# → Prisma prompts for a name (e.g., "add_users_table")
# → Generates SQL in packages/database/prisma/migrations/
# → Applies it to the database immediately

# Apply pending migrations (used in CI/CD)
pnpm db:deploy

# View migration status
pnpm db:status

# Push schema changes directly (local dev only, NOT production)
pnpm db:push
```

### Making a Schema Change

1. **Edit the schema** in `packages/database/prisma/schema.prisma`
2. **Run `pnpm db:migrate`** locally and give the migration a descriptive name
3. **Commit the generated SQL file** in `packages/database/prisma/migrations/`
4. **Push to main** — the deploy workflow automatically runs `prisma migrate deploy` before building

**Never use `pnpm db:push` in production.** It skips the migration system entirely, leaving no history.

---

## Apps

### 1. **app** — Marketing Site / Main App (Port 3000)

Next.js 14 with App Router. Serves as your customer-facing website or primary application frontend.

**Key files:**
- `apps/app/src/app/` — Pages, layouts, and API routes
- `apps/app/next.config.js` — Next.js configuration
- `apps/app/tailwind.config.js` — Tailwind CSS configuration

**Features:**
- Authentication-ready (NextAuth v4)
- Tailwind CSS + Radix UI components
- DB-backed content stubs in `src/app/blog`, `src/app/portfolio`, `src/app/services` (Contentlayer was removed during the April 2026 outage recovery — wire to Prisma or your CMS of choice)

### 2. **dashboard** — Admin Dashboard (Port 3001)

Next.js 14 admin interface for managing your application.

**Key files:**
- `apps/dashboard/src/app/` — Dashboard pages and API routes
- `apps/dashboard/src/components/` — UI components
- `apps/dashboard/.env.local` — Dashboard-specific secrets

**Features:**
- NextAuth authentication
- Prisma database integration
- Job queue integration for background tasks

**Important:** Dashboard has `cache: false` in turbo.json because Prisma engine binaries are platform-specific. Never enable caching for `dashboard#build`.

### 3. **worker** — BullMQ Job Processor

Background job processor for long-running tasks. Runs in Docker.

**Deployment:** Docker on Railway (via `apps/worker/Dockerfile`)

**Key files:**
- `apps/worker/src/index.ts` — Worker entry point
- `apps/worker/Dockerfile` — Docker build config

**Note:** Excluded from Vercel builds. Deploy separately using Docker.

---

## Packages (Shared Libraries)

### 1. **database** — Prisma ORM

Defines the database schema and provides a shared Prisma client.

**Key files:**
- `packages/database/prisma/schema.prisma` — Database schema
- `packages/database/prisma/migrations/` — Migration history
- `packages/database/index.ts` — Re-exports Prisma client

**Usage:**
```typescript
import { PrismaClient } from "database";
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { id: "user-123" },
});
```

### 2. **queue** — BullMQ + Redis

Generic job queue factory and Redis connection management.

**Key files:**
- `packages/queue/index.ts` — Queue factory and exports

**Usage:**
```typescript
import { QueueMQ, makeConnection, Worker } from "queue";

// Create a queue
const myQueue = QueueMQ("my-queue");
await myQueue.add("job-name", { /* job data */ });

// Create a worker (with dedicated connection)
const worker = new Worker("my-queue", processor, {
  connection: makeConnection(),
});
```

### 3. **email** — Resend Integration

Transactional email wrapper around [Resend](https://resend.com). Used by
`packages/auth` for password-reset emails. In dev (`NODE_ENV !== "production"`)
sends are no-op'd to console so you can develop without a Resend account.

**Key files:**
- `packages/email/index.ts` — Email sending functions

**Usage:**
```typescript
import { sendPasswordResetEmail } from "email";

await sendPasswordResetEmail({
  toEmail:          "user@example.com",
  toName:           "Jane",
  resetLink:        "https://example.com/reset-password?token=abc",
  expiresInMinutes: 60,
});
```

**Env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (bare email, no quotes —
Vercel stores quotes literally and Resend rejects the malformed `from`).

### 4. **auth** — Shared NextAuth Config (TT-118)

Single source of truth for authentication. Both `apps/app` and
`apps/dashboard` consume `buildAuthOptions()` from this package, so adding
a provider or tightening the signIn callback is a one-place change.

**Includes:**
- `buildAuthOptions({ appName, prisma, google?, github?, cookieDomain? })` — factory for NextAuth options
- `requestPasswordReset()` / `consumePasswordReset()` — token-based reset flow
- `MIN_PASSWORD_LENGTH`, `RESET_TOKEN_TTL_MINUTES` — shared constants
- `generateAuthToken()` — JWT helper re-exported by both apps' `src/utils`
- A `PrismaAdapter` wrapper that bridges the User-schema mismatch with NextAuth's expected fields

**Env vars consumed:** `NEXTAUTH_SECRET` (required), `NEXTAUTH_URL` (prod),
`NEXTAUTH_COOKIE_DOMAIN` (optional, for cross-subdomain SSO),
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.

### 5. **env** — Env-Context Helpers

Tiny package — `isLocal()`, `isPreview()`, `marketingAppUrl()`,
`dashboardUrl()`. Use these instead of inline `process.env.NODE_ENV` checks
or hardcoded URL fallbacks. Defaults to `https://example.com` if app URL
env vars are unset, so cloned repos don't crash before you wire them up.

### 6. **ui** — React Component Library

Shared, reusable React components used across app and dashboard.

**Key files:**
- `packages/ui/src/components/` — Component definitions
- `packages/ui/package.json` — Exports

### 7. **eslint-config** — ESLint Presets

Shared ESLint configuration for consistent code quality.

**Usage:**
```javascript
// .eslintrc.js
module.exports = {
  extends: ["eslint-config/next"],
};
```

### 8. **typescript-config** — tsconfig Bases

Shared TypeScript configurations for different app types.

**Usage:**
```json
{
  "extends": "typescript-config/nextjs"
}
```

---

## Turborepo Pipeline

Build and task orchestration defined in `turbo.json`.

### Task Definitions

| Task | Dependencies | Cached? | Details |
|------|---|---|---|
| `dev` | `^db:generate` | ✗ | Runs dev servers concurrently |
| `build` | `^build`, `^db:generate` | ✓ | Outputs Next.js builds |
| `dashboard#build` | `^build`, `^db:generate` | ✗ | **Never cache** — Prisma binaries are platform-specific |
| `db:generate` | — | ✗ | Prisma client generation |
| `lint` | `^lint` | ✓ | ESLint checks |

### Filtering Tasks

Run tasks on specific packages:

```bash
# Build only app and dashboard
pnpm build --filter app --filter dashboard

# Run dev for dashboard only
pnpm dev --filter dashboard

# Exclude worker from builds
pnpm build --filter=!worker
```

---

## Deployment

### Vercel (App + Dashboard)

Automated deployments via GitHub Actions (`.github/workflows/deploy-vercel.yml`). Triggered on push to `main`.

**Pipeline:**
1. Apply pending database migrations
2. Generate Prisma client
3. Build Next.js apps
4. Deploy to Vercel

**Required GitHub Secrets:**
- `VERCEL_TOKEN` — Personal access token
- `VERCEL_ORG_ID` — Organization ID
- `VERCEL_APP_PROJECT_ID` — App project ID
- `VERCEL_DASHBOARD_PROJECT_ID` — Dashboard project ID

**Environment Variables in Vercel:**
Set `DATABASE_URL` and `DIRECT_URL` in project settings.

### Docker (Worker)

Deploy the worker as a standalone Docker service on Railway or similar.

**Dockerfile:** `apps/worker/Dockerfile`

```bash
docker build -t my-worker apps/worker
docker run -e REDIS_URL=... -e DATABASE_URL=... my-worker
```

---

## Extending the Template

### Adding a New Database Model

1. Edit `packages/database/prisma/schema.prisma`
2. Run `pnpm db:migrate` and name your migration
3. Import the new model in your apps: `import { MyModel } from "database"`

### Adding a New Job Queue

1. In your app, use the generic queue factory:
   ```typescript
   import { QueueMQ, makeConnection, Worker } from "queue";
   
   const myQueue = QueueMQ("my-queue");
   await myQueue.add("job-name", jobData);
   ```

2. In the worker, create a processor:
   ```typescript
   const worker = new Worker("my-queue", processor, {
     connection: makeConnection(),
   });
   ```

### Adding a New Package

1. Create a directory: `mkdir packages/my-package`
2. Add `package.json` with a unique name
3. Run `pnpm install` to link the workspace
4. Import from other apps: `import { ... } from "my-package"`

### Adding a New App

1. Create directory: `mkdir apps/my-app`
2. Copy `next.config.js`, `tsconfig.json`, `package.json` from existing app
3. Update the name in `package.json`
4. Run `pnpm install`
5. Add scripts to `turbo.json` if needed
6. Test locally: `pnpm dev --filter my-app`

---

## Environment Variables

### Root `.env`

The full reference — every variable, what it does, where to get the value —
lives in [`.env.example`](./.env.example). `cp .env.example .env` and fill
in real values. Highlights:

| Var | Required? | Notes |
|-----|-----------|-------|
| `DATABASE_URL` | yes | Pooled (pgBouncer) Postgres URL |
| `DIRECT_URL` | yes | Direct (non-pooled) Postgres URL — Prisma CLI |
| `REDIS_URL` | yes | BullMQ; Upstash `rediss://` works |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | yes | Public origin of the marketing app — used for password-reset links |
| `NEXTAUTH_URL` | prod | Set in Vercel; locally each app picks its own port |
| `NEXTAUTH_COOKIE_DOMAIN` | optional | Set to `.example.com` for cross-subdomain SSO |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google OAuth button |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional | GitHub OAuth (dashboard only) |
| `RESEND_API_KEY` | optional in dev | Required to send real reset emails in prod |
| `RESEND_FROM_EMAIL` | optional in dev | Verified sender address (no quotes!) |

In dev, the email package logs to console when `RESEND_API_KEY` is unset
or `NODE_ENV !== "production"`, so you can develop the password-reset flow
without a Resend account.

### App-Specific `.env.local`

Created per-app for overrides not committed to git. The most common case is
local-dev `NEXTAUTH_URL`:

**`apps/app/.env.local`**
```env
NEXTAUTH_URL="http://localhost:3000"
```

**`apps/dashboard/.env.local`**
```env
NEXTAUTH_URL="http://localhost:3001"
```

---

## Common Tasks

### Building for Production

```bash
pnpm build
```

This runs the full Turborepo pipeline:
1. Generates Prisma client
2. Builds all apps in dependency order
3. Outputs Next.js builds

### Adding a Feature

1. Create a database model in `packages/database/prisma/schema.prisma`
2. Generate migration: `pnpm db:migrate`
3. Build the feature across your apps
4. Push to main; GitHub Actions handles deployment

### Running Database Migrations in CI/CD

The deploy workflow runs `prisma migrate deploy` automatically. To manually apply pending migrations:

```bash
pnpm db:deploy
```

---

## Important Notes & Gotchas

### 1. Dashboard Cache Disabled

The `dashboard#build` task has `cache: false` in `turbo.json`. **Do not enable caching.** Prisma engine binaries are platform-specific and will fail on cache replay.

### 2. DIRECT_URL Required for Prisma CLI

Prisma CLI (`db:migrate`, `db:push`) requires `DIRECT_URL` and will NOT read `.env.local`. Set it in the root `.env`.

### 3. Worker Excluded from Vercel

The worker is not deployed to Vercel. It's a separate Docker app. To build it explicitly:
```bash
pnpm build --filter worker
```

### 4. TypeScript Version in Docker

Pin `typescript@5` in Docker builds. TypeScript 6+ changed CLI behavior and breaks the build.

### 5. Never Use `npx tsc`

`npx tsc` installs the wrong npm package. Always use the globally installed `tsc` or add TypeScript to dependencies.

### 6. Redis URL Format

Upstash provides a `rediss://` URL (TLS-secured). Make sure your Redis client supports TLS. BullMQ does by default.

---

## Troubleshooting

### "Database connection timeout"
- Check `DATABASE_URL` is correct
- Verify network connectivity to database host
- For Neon, check IP whitelist

### "Prisma client not found"
- Run `pnpm db:generate` to regenerate
- Verify `packages/database` is installed

### "Port 3000/3001 already in use"
- Check what's running: `lsof -i :3000`
- Kill the process: `kill -9 [PID]`
- Or change the port in the dev script

### "Worker not starting"
- Verify `REDIS_URL` is set and accessible
- Check `packages/queue` is installed
- Review worker logs for errors

### "GitHub Actions deploy failed"
- Check GitHub Secrets are set correctly
- Verify both `DATABASE_URL` and `DIRECT_URL` in Vercel
- Review deploy logs in GitHub Actions tab

---

## Contributing

### Commits & Branching

- Use descriptive commit messages: `feat: add user auth`, `fix: handle null emails`
- Create feature branches: `git checkout -b feature/user-profiles`
- Push to main only after code review

### Code Quality

- Run `pnpm lint` before committing
- Run `pnpm format` to auto-format code
- TypeScript strict mode is enabled — fix type errors before pushing

### Database Changes

- Always create migrations: `pnpm db:migrate`
- Never manually edit SQL files
- Commit migration files — they're part of schema history

---

## Support & Documentation

- **Turborepo docs:** https://turbo.build
- **Next.js docs:** https://nextjs.org
- **Prisma docs:** https://www.prisma.io
- **BullMQ docs:** https://docs.bullmq.io
- **NextAuth docs:** https://next-auth.js.org
- **Resend docs:** https://resend.com/docs

---

## License

Internal Two Trees Digital template. Customize and use for your own projects.
