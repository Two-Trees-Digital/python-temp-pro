# python-temp-pro — Contributor & AI Agent Guide

**python-temp-pro is the Node-monorepo half of a composite template pair.** New apps provisioned from `python-temp-pro` via create-app get TWO repos: this Node template (Next.js apps + GraphQL + BullMQ worker) AND the paired Python FastAPI service ([python-temp-pro-service](https://github.com/Two-Trees-Digital/python-temp-pro-service)). They share a Neon Postgres DB and authenticate to each other via HMAC.

> **For the full workflow contract** (phased commit/PR gate protocol, testing contract, dangerous-change checklist, known gotchas, AI agent operating rules, multi-agent coordination protocol): see [**`CLAUDE.md` in two-trees-digital-new**](https://github.com/Two-Trees-Digital/two-trees-digital-new/blob/main/CLAUDE.md). That file is the authoritative source of truth across Two Trees projects. This file only covers what's specific to the python-temp-pro composite.

---

## Composite-pair shape

- **Two repos per spawned project**: Node monorepo (from this template) + Python service (from python-temp-pro-service)
- **Shared Neon Postgres database**: Prisma (Node, this repo) owns User/Role/Auth tables; SQLAlchemy (Python service) owns domain tables
- **Cross-service auth via HMAC**: `HMAC_SHARED_SECRET` must match EXACTLY on both Vercel (Node) and Railway (Python). Mismatch → silent 401s
- **`user_id` references on Python side** are plain `String` FKs (no SQLAlchemy ForeignKey constraint) — DB-level FK enforced by Prisma

---

## When to use which template

| Scenario | Template |
|---|---|
| Pure Node app, no Python compute needed | `turbo-temp` |
| Node app + Python compute service, no agents | **python-temp-pro** (this) |
| Node app + Python multi-agent (LangGraph) service | `lang-temp-pro` |

If a spawned app starts here and later needs agents, the migration path is: add LangGraph to the Python service. The Node side doesn't change much (some SSE wiring) and lang-temp-pro's Node half is a superset of this template.

---

## Calling the paired Python service

Three patterns wired in this template — pick the right one per use case:

### Worker queue (recommended for most cross-service calls)

Producer enqueues a `PythonServiceJobData` payload; the worker (`apps/worker/src/queues/python-service.ts`) dequeues, HMAC-signs, POSTs to the Python service. BullMQ retry policy handles transient failures.

```ts
import { getPythonServiceQueue } from "queue";

await getPythonServiceQueue().add("my-job", {
  endpoint: "/my-endpoint",
  payload:  { userId, foo: "bar" },
});
```

### Direct from Apollo resolver (low-latency, blocking)

Use `signedPost()` from `packages/queue` directly:

```ts
import { signedPost } from "queue";

const result = await signedPost({
  url:    `${process.env.PYTHON_SERVICE_URL}/my-endpoint`,
  body:   { userId },
  secret: process.env.HMAC_SHARED_SECRET!,
});
```

### Browser → Python service (proxy through Next.js)

The browser **never** sees `HMAC_SHARED_SECRET`. Proxy via a Next.js route handler in `apps/dashboard/src/app/api/` that mints whatever auth is appropriate for the browser context.

---

## What's load-bearing in this template

- **`packages/queue/hmacSign.ts`** — the cross-service HMAC contract. Signature format MUST match python-temp-pro-service's `app/auth.py`. Don't change the format without changing both sides.
- **`packages/queue/index.ts`** — `getPythonServiceQueue()` + `PythonServiceJobData` type. Producers depend on this shape.
- **`packages/env/index.ts`** — `pythonServiceEnvSchema` enforces `PYTHON_SERVICE_URL` + `HMAC_SHARED_SECRET` at validation time. Apps that use the composite pattern merge this into their env schema.
- **`apps/worker/src/queues/python-service.ts`** — the Worker that signs + POSTs. Single source of truth for Node → Python calls.

Everything else inherited from turbo-temp (styled-jsx hoist, lazy queue pattern, Prisma postinstall, Turbo pin, health endpoints, CI workflows) still applies — see the turbo-temp CLAUDE.md notes.

---

## Working on this template itself

1. **Every change here is inherited by all future apps** provisioned from this template. Existing provisioned apps do NOT auto-update — they have a frozen copy of python-temp-pro from bootstrap time.
2. **For high-risk changes** (HMAC signature format, queue payload shape, env-var contracts): coordinate with python-temp-pro-service. The two halves share an interface — breaking it on one side without the other = silent prod outage.
3. **For Node-only changes** (UI tweaks, new packages, dashboard pages): same testing contract as turbo-temp.
4. **Provision one real test app pair** from create-app to validate end-to-end after high-risk changes. Tear down after.

---

## Conventions for agents working in this repo

- **Don't run `git` from a sandbox** — sandbox runs as a non-owner user and contaminates `.git/` permissions. Use file tools for edits, hand off commit chains to the human.
- **No emoji in code, comments, or commit messages** unless explicitly requested.
- **Code comments are terse**: 1-4 lines, what + non-obvious gotcha only. Rationale belongs in commit messages.
- **READMEs stay ticket-agnostic** — describe current state, not history. No TT-XXX references in README files.
- **Commit messages end with "Closes TICKET-ID"** when there's a linked ticket; auto-closes the ticket on PR merge.
- **No Co-Authored-By lines** in commits.
- **Stop commit chains at `git push`** — humans open PRs themselves.

---

## Related repos + tickets

- **[python-temp-pro-service](https://github.com/Two-Trees-Digital/python-temp-pro-service)** — Python half of this pair
- TT-183 — extract python-temp-pro from trading-agents-service (this work)
- TT-352 — extract lang-temp-pro (LangGraph overlay on top of python-temp-pro)
- TT-184 — add Railway provider to bootstrap CLI
- TT-185 — add `--template` selection to bootstrap CLI (this template becomes one of 6 options)
- TT-188 — add composite project type to create-app (spawns both halves of the pair)
