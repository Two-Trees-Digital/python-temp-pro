# CI/CD Workflows

> **GitHub Actions** | Vercel CLI | Prisma Migrate

CI/CD pipeline configuration for the turbo-temp monorepo. Currently contains a single workflow for deploying frontend apps to Vercel.

---

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
  - [deploy-vercel.yml](#deploy-vercelyml)
- [Required GitHub Secrets](#required-github-secrets)
- [How Secrets Get Set](#how-secrets-get-set)
- [Template vs. Child Repos](#template-vs-child-repos)
- [How the Guard Works](#how-the-guard-works)
- [Adding a New Workflow](#adding-a-new-workflow)
- [Troubleshooting](#troubleshooting)

---

## Overview

The workflow strategy for turbo-temp splits deployment responsibilities:

- **Vercel** handles app and dashboard builds + hosting (triggered by this workflow)
- **Railway** handles the worker service (triggered by Railway's own GitHub integration, not this workflow)
- **Neon** handles the database (no CI/CD needed — migrations run during dashboard build)

This means pushing to `main` triggers two parallel systems: GitHub Actions deploys to Vercel, and Railway auto-deploys the worker from the Dockerfile.

---

## Workflows

### deploy-vercel.yml

**Trigger**: Push to `main` branch

**Purpose**: Deploys `apps/app` and `apps/dashboard` to Vercel production.

**Jobs** (run in parallel):

#### 1. `deploy-app` — Deploy app to Vercel

Deploys the main marketing site / customer-facing app (`apps/app`) to Vercel.

Steps:
1. Checkout code (`actions/checkout@v4`)
2. Check if `VERCEL_TOKEN` secret exists — writes `configured=true/false` to `GITHUB_OUTPUT`
3. Install Vercel CLI (`npm install -g vercel@latest`) — only if configured
4. Deploy to production (`vercel deploy --prod`) — only if configured

Environment:
- `VERCEL_ORG_ID` from `secrets.VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` from `secrets.VERCEL_APP_PROJECT_ID`

#### 2. `deploy-dashboard` — Deploy dashboard to Vercel

Deploys the admin dashboard (`apps/dashboard`) to Vercel. Identical flow to deploy-app but uses `VERCEL_DASHBOARD_PROJECT_ID`.

Environment:
- `VERCEL_ORG_ID` from `secrets.VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` from `secrets.VERCEL_DASHBOARD_PROJECT_ID`

**Important**: Vercel handles the actual build on their servers. This workflow does NOT build locally — it just triggers a production deployment via the Vercel CLI. The dashboard's `build` script in `package.json` runs on Vercel's build servers and includes:
1. Compile shared packages (queue, email) with `tsc`
2. Run `prisma migrate deploy` (applies pending migrations)
3. Run `prisma generate` (generates the client)
4. Run `next build`

---

## Required GitHub Secrets

These secrets must be configured in the repository's Settings > Secrets and variables > Actions.

| Secret | Description | Where to get it |
|---|---|---|
| `VERCEL_TOKEN` | Personal access token for Vercel CLI | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your Vercel team/org ID | Vercel dashboard > Settings > General |
| `VERCEL_APP_PROJECT_ID` | Project ID for the main app | Vercel dashboard > Project > Settings > General |
| `VERCEL_DASHBOARD_PROJECT_ID` | Project ID for the dashboard | Vercel dashboard > Project > Settings > General |

All four secrets are required for deployments to work. If `VERCEL_TOKEN` is missing, both jobs skip gracefully. If `VERCEL_TOKEN` is set but a project ID is missing, that specific deployment will fail.

---

## Setting Secrets

To enable deployments:

1. Fork or clone turbo-temp for your project
2. In your repository, go to **Settings > Secrets and variables > Actions**
3. Add the four required secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_APP_PROJECT_ID`, `VERCEL_DASHBOARD_PROJECT_ID`
4. Push to `main` — the workflow will now deploy to Vercel

If secrets are not configured, the workflow skips deployment gracefully (the guard step ensures the workflow passes without errors).

---

## How the Guard Works

GitHub Actions does not allow `secrets.*` directly in `if:` conditions on steps. The workaround is a dedicated "check" step that writes to `GITHUB_OUTPUT`:

```yaml
- name: Check Vercel configuration
  id: check
  run: |
    if [ -n "${{ secrets.VERCEL_TOKEN }}" ]; then
      echo "configured=true" >> $GITHUB_OUTPUT
    else
      echo "configured=false" >> $GITHUB_OUTPUT
    fi

- name: Deploy
  if: steps.check.outputs.configured == 'true'
  run: vercel deploy --prod ...
```

All subsequent steps use `if: steps.check.outputs.configured == 'true'` to conditionally execute. This pattern is used in both jobs.

---

## Adding a New Workflow

If you need to add a new workflow (e.g., for running tests, linting, or deploying to a new provider):

1. Create a new `.yml` file in `.github/workflows/`
2. Follow the same guard pattern if the workflow depends on secrets that may not be set
3. Use `actions/checkout@v4` for checking out code
4. If the workflow needs the Prisma client, run `pnpm db:generate` before building

Example skeleton:

```yaml
name: Run Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm lint
      - run: pnpm test
```

---

## Troubleshooting

### "You specified VERCEL_ORG_ID but you forgot to specify VERCEL_PROJECT_ID"

This means `VERCEL_TOKEN` and `VERCEL_ORG_ID` secrets are set, but the project-specific ID (`VERCEL_APP_PROJECT_ID` or `VERCEL_DASHBOARD_PROJECT_ID`) is missing. Check the repository secrets in GitHub Settings.

### Workflow runs but nothing deploys

Check the "Check Vercel configuration" step output. If it says "VERCEL_TOKEN secret not set — skipping deployment", the secret is not configured for this repo.

### Dashboard deploy fails with Prisma engine error

```
PrismaClientInitializationError: Unable to require
`.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node`
```

This happens when turbo replays a cached build from a different platform. Verify that `turbo.json` has `cache: false` for `dashboard#build`. This should already be set — do not re-enable caching for the dashboard.

### Dashboard deploy fails with "DIRECT_URL not found"

Prisma CLI needs `DIRECT_URL` for migrations. This env var must be set in the Vercel project's environment variables (not just locally). Add it in Vercel dashboard > Project > Settings > Environment Variables.

### Railway worker doesn't deploy on push

Railway has its own GitHub integration — it does NOT use this workflow. If deploying the worker to Railway:
1. Connect your GitHub repo to a Railway service
2. Set the Railway service to deploy from the `main` branch using the Dockerfile at `apps/worker/Dockerfile`
3. Configure environment variables (REDIS_URL, DATABASE_URL, etc.) in the Railway dashboard

---

## File Structure

```
.github/
└── workflows/
    ├── deploy-vercel.yml    — Vercel deployment workflow
    └── README.md            — This file
```
