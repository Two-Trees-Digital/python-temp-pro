# turbo-temp — Contributor & AI Agent Guide (Template)

**turbo-temp is the monorepo template** that new Two Trees Digital apps are provisioned from via the create-app flow in two-trees-digital-new's admin dashboard. Changes here propagate to every future app provisioned after the change lands.

> **For the full workflow contract** (phased commit/PR gate protocol, testing contract, dangerous-change checklist, known gotchas, AI agent operating rules, multi-agent coordination protocol): see [**`CLAUDE.md` in two-trees-digital-new**](https://github.com/Two-Trees-Digital/two-trees-digital-new/blob/main/CLAUDE.md).
>
> That file is the authoritative source of truth for how work happens across Two Trees projects. This file (`turbo-temp/CLAUDE.md`) only covers what's template-specific.

---

## Working on turbo-temp itself

When you edit turbo-temp:

1. **Every change here will be inherited by all future apps** provisioned from this template. Existing provisioned apps do NOT auto-update — they have a frozen copy of turbo-temp from the moment they were bootstrapped.
2. For high-risk changes (anything that affects build, deploy, or runtime correctness — see two-trees's CLAUDE.md §5 and §6): ship, merge, and then **provision one real test app** from the create-app flow to validate the change end-to-end. Tear down the test app after. Manual resource cleanup applies until TT-18's testing strategy lands.
3. Branch naming follows the same `[A-Z]+-[0-9]+` convention that the auto-link commit hook expects. Use `TT-#` prefix for turbo-temp-specific tickets tracked in the Two Trees Digital Linear project.

## What's in turbo-temp that new apps inherit

The big load-bearing pieces (all documented in detail in two-trees's CLAUDE.md §5):

- **Styled-jsx hoist** — `scripts/hoist-styled-jsx.js` + root `postinstall` hook + `apps/app/next.config.mjs` `outputFileTracingIncludes` + worker Dockerfile `COPY scripts/` before install. Prevents a specific pnpm+Vercel Lambda symlink failure mode. **Do not remove any of these without reading two-trees's §5.1.**
- **Lazy queue pattern** — `packages/queue/index.ts` uses `getConnection()` / `getCreateAppQueue()` / `getNotifyQueue()` getter functions (not eager `const connection = new IORedis(...)`). Prevents `next build` from failing with `ECONNREFUSED 127.0.0.1:6379`. See §5.3.
- **Prisma generate postinstall** — `packages/database/package.json` runs `prisma generate` automatically during `pnpm install`. Worker Dockerfile has the corresponding `COPY packages/database/prisma/` before install. See §5.9 + §5.10.
- **Turbo pinned to `^1.13.0`** — root `package.json`. Do not upgrade to 2.x; per-package task filters break. See §5.4.
- **Health endpoints** — `/api/health` on both app and dashboard, with `/healthz` / `/ping` / `/health` rewrites. Used by the dashboard's health-check cron and by this workflow's smoke tests.
- **CI workflow** — `.github/workflows/deploy-vercel.yml` runs `test`, `schema-drift-check`, `migrate-prisma`, `deploy-app`, `deploy-dashboard` with smoke tests. Gracefully skips steps when required secrets/vars aren't set. See §3.3.

## Deferred — not in turbo-temp yet

- **Sentry integration** (instrumentation files, sentry configs, `global-error.tsx`). Held until Sentry is proven stable in two-trees-digital-new. Will be synced in a future TT-16 follow-up ticket.
- **Full CLAUDE.md template** — this file is currently a shim pointing at two-trees's. Replacement plan tracked in **TT-35**: a fully adapted ~500-line CLAUDE.md with placeholders for project-specific content, customized per-app at provision time.

## When a new app is provisioned from this template

create-app clones turbo-temp, creates a new GitHub repo + Vercel projects + Neon DB + Upstash Redis + Railway worker + Linear project, and drops the new app's specifics (Linear project prefix, Vercel project IDs, Neon connection strings, etc.) into GitHub repo variables and Vercel env vars.

Agents working on a newly-provisioned app should treat **two-trees's CLAUDE.md as the primary contract** for now. When TT-35 lands, this file will be replaced with a more useful self-contained guide.

## Related tickets

- TT-16 — umbrella for syncing improvements from two-trees-digital-new to this template
- TT-17 — create-app worker pipeline hardening (env var ordering, Vercel Git integration, etc.)
- TT-18 — create-app testing strategy (mocks + dry-run + auto-cleanup)
- TT-35 — replace this shim with a full generic-template CLAUDE.md
