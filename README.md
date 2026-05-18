# 🌲🐍 python-temp-pro — Node + Python Composite Template

> **Two Trees Digital** | Node monorepo (Turborepo + pnpm + Next.js 14 + Prisma + BullMQ) + paired Python service (FastAPI)

The **Node half** of the `python-temp-pro` composite template pair. Pairs with **[python-temp-pro-service](https://github.com/Two-Trees-Digital/python-temp-pro-service)** (the Python FastAPI half) to spawn full Node + Python composite apps — same shape as `lyceum-fund` + `trading-agents-service`, but **without LangGraph or agent code**.

For agent apps (LangGraph + structured-output extraction + SSE streaming), use `lang-temp-pro` + `lang-temp-pro-service` instead.

For Node-only apps with no Python half, use [turbo-temp](https://github.com/Two-Trees-Digital/turbo-temp) directly.

---

## Composite-pair shape

```
This repo (python-temp-pro)
├── Node monorepo (Next.js apps, GraphQL API, BullMQ worker)
│     ↕  HMAC-signed POST + shared Neon DB
└── python-temp-pro-service (separate repo, FastAPI)
      └── Headless Python compute layer
```

- **Two repos per spawned project** — one Node monorepo (this template), one Python service ([python-temp-pro-service](https://github.com/Two-Trees-Digital/python-temp-pro-service))
- **Shared Neon Postgres database.** Prisma (this repo) owns User/Role/Auth tables; SQLAlchemy (Python service) owns its own domain tables. `user_id` columns on the Python side reference Prisma's User table via DB-level FK.
- **HMAC-signed cross-service calls.** This Node side signs POST requests with `HMAC_SHARED_SECRET`; the Python service verifies in its middleware.
- **Independent deploys.** Vercel deploys the Node side; Railway deploys the Python service. Both pull from the same Neon DB.

---

## What's in this template (Node side)

| Layer | Description |
|---|---|
| **apps/app** | Next.js 14 user-facing app (port 3000) |
| **apps/dashboard** | Next.js 14 admin dashboard (port 3001) |
| **apps/api** | Apollo Server v4 GraphQL — canonical typed API surface |
| **apps/worker** | BullMQ worker: email-verification + python-service queues |
| **apps/mobile** | React Native (Expo) — optional, remove if unused |
| **packages/queue** | BullMQ wrappers + HMAC signer (`signedPost`) for Python calls |
| **packages/env** | Env-context helpers + Zod validation including `pythonServiceEnvSchema` |
| **packages/database** | Prisma schema + migrations |
| **packages/auth, email, ui, …** | Shared NextAuth, Resend wrapper, React components |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Frontend** | Next.js 14 App Router, React 18, Tailwind |
| **API** | Apollo Server v4 (`apps/api`); `@apollo/client@^3.8` in Next apps |
| **Auth** | NextAuth v4 via `packages/auth` |
| **Database** | PostgreSQL (Neon) + Prisma; shared with the paired Python service |
| **Job queue** | BullMQ + Upstash Redis |
| **Cross-service** | HMAC-signed POST to Python service via `signedPost()` in `packages/queue` |
| **Email** | Resend (verification + password reset) |
| **Hosting** | Vercel (apps) + Railway (apps/worker) |
| **CI/CD** | GitHub Actions: `deploy-vercel.yml` + `build-worker.yml` + `build-api.yml` |

---

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 8.9.0+
- PostgreSQL (local or Neon)
- Redis (local or Upstash)
- The paired Python service running locally or deployed — see [python-temp-pro-service](https://github.com/Two-Trees-Digital/python-temp-pro-service)

### 1. Use this template

Click "Use this template" on GitHub OR (once create-app supports template selection — TT-185) provision via the Two Trees Platform dashboard. Spawning the `python-temp-pro` composite via create-app provisions BOTH the Node side (this template) AND the Python side automatically, wiring them with a shared HMAC secret + shared Neon DB.

```sh
git clone https://github.com/Two-Trees-Digital/<your-app-name>.git
cd <your-app-name>
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in. The **Python-service vars** are required for the composite pattern:

```env
PYTHON_SERVICE_URL=http://localhost:8000           # full URL of paired Python service
HMAC_SHARED_SECRET=<openssl rand -hex 32>          # MUST match Python side EXACTLY
```

Standard turbo-temp vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, etc.) — see `.env.example` for the full list.

### 3. Set up the database

```sh
pnpm db:deploy        # apply all migrations
pnpm db:generate      # regenerate Prisma client
```

### 4. Start everything

```sh
pnpm dev              # app on 3000, dashboard on 3001, worker watching
```

In a separate terminal, start the paired Python service:

```sh
cd ../python-temp-pro-service     # or wherever your Python side lives
uvicorn app.main:app --reload --port 8000
```

---

## Calling the Python service

Three patterns are wired in this template:

### 1. From the worker (queued, async, retryable)

The recommended pattern. Producer enqueues a `PythonServiceJobData` payload; the worker dequeues, signs, and POSTs.

```ts
// In a route handler or Apollo resolver:
import { getPythonServiceQueue } from "queue";

await getPythonServiceQueue().add("my-job", {
  endpoint: "/my-endpoint",
  payload:  { userId, foo: "bar" },
  meta:     { requestId: req.id },
});
```

### 2. Direct from API resolver (sync, blocking, no retry)

For low-latency calls where you need the response before returning to the client:

```ts
import { signedPost } from "queue";

const result = await signedPost({
  url:    `${process.env.PYTHON_SERVICE_URL}/my-endpoint`,
  body:   { userId, foo: "bar" },
  secret: process.env.HMAC_SHARED_SECRET!,
});

if (!result.ok) throw new GraphQLError(`Python service error: ${result.error}`);
return result.data;
```

### 3. From the dashboard via /api proxy

For browser → Python service flows (e.g., SSE streaming), proxy through a Next.js route handler in `apps/dashboard/src/app/api/`. The proxy mints any browser-safe auth (e.g., query-param token for SSE) and forwards the request. **The browser never sees `HMAC_SHARED_SECRET` directly.**

---

## Deployment

### Vercel (apps/app + apps/dashboard)

Auto-deploys on push to `main`. Migrations applied via `prisma migrate deploy` in the build step. Set on Vercel project env vars:

- All standard turbo-temp env vars (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- `PYTHON_SERVICE_URL` (the Python service's production URL)
- `HMAC_SHARED_SECRET` (must match Python service's value exactly)

### Railway (apps/worker)

Auto-rebuilds on push to main. Env vars on the Railway service:

- All worker-required vars (DATABASE_URL, REDIS_URL, RESEND_API_KEY)
- `PYTHON_SERVICE_URL`
- `HMAC_SHARED_SECRET`

### Railway (Python service — separate repo)

See [python-temp-pro-service README](https://github.com/Two-Trees-Digital/python-temp-pro-service) for deployment. Critical: its `HMAC_SHARED_SECRET` must match the value set on Vercel + Railway here.

---

## Layered relationship

```
turbo-temp                 →   Node-only template (no Python half)
                                    ↓ extended by
python-temp-pro            →   Node + Python composite (THIS template)
                                    ↓ extended by
lang-temp-pro              →   Node + Python with LangGraph (agent apps)
```

When choosing a template for a new app:

- **Pure Node, no Python service** → use `turbo-temp` directly
- **Node app + Python compute service, no agents** → `python-temp-pro` (this)
- **Node app + Python multi-agent service** → `lang-temp-pro`

---

## Project structure

```
python-temp-pro/                    ← Node monorepo (this repo)
├── apps/
│   ├── app/                        ← Next.js user-facing (port 3000)
│   ├── dashboard/                  ← Next.js admin (port 3001)
│   ├── api/                        ← Apollo GraphQL
│   └── worker/
│       └── src/
│           ├── index.ts            ← Worker entrypoint
│           └── queues/
│               ├── email-verification.ts
│               └── python-service.ts   ← Dequeues + signs + POSTs to Python service
├── packages/
│   ├── queue/
│   │   ├── index.ts                ← BullMQ + lazy queue getters + PythonServiceJobData type
│   │   └── hmacSign.ts             ← signedPost() — HMAC-signed POST helper
│   ├── env/
│   │   └── index.ts                ← baseEnvSchema + pythonServiceEnvSchema
│   ├── database/                   ← Prisma schema + migrations
│   ├── auth/                       ← NextAuth factory
│   ├── email/                      ← Resend wrapper
│   └── ui/                         ← Shared React components
├── .env.example                    ← includes PYTHON_SERVICE_URL + HMAC_SHARED_SECRET
└── README.md (this file)
```

---

## References

- **[python-temp-pro-service](https://github.com/Two-Trees-Digital/python-temp-pro-service)** — the Python FastAPI half of this composite pair
- [turbo-temp](https://github.com/Two-Trees-Digital/turbo-temp) — Node-only template (no Python half)
- [lang-temp-pro](https://github.com/Two-Trees-Digital/lang-temp-pro) + [lang-temp-pro-service](https://github.com/Two-Trees-Digital/lang-temp-pro-service) — Agent-app composite (extends python-temp-pro with LangGraph)
- [lyceum-fund](https://github.com/Two-Trees-Digital/lyceum-fund) + [trading-agents-service](https://github.com/Two-Trees-Digital/trading-agents-service) — Reference implementation (agent app — lang-temp-pro shape)
- [Two Trees Platform](https://github.com/Two-Trees-Digital/two-trees-digital-new) — Parent platform that orchestrates spawned apps

---

**Built by Two Trees Digital** 🌲 | [GitHub](https://github.com/Two-Trees-Digital)
