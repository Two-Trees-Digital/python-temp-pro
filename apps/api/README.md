# `api`

Apollo Server v4 + Express service. Hosts the app's GraphQL schema and any side-channel REST endpoints (file upload, etc.).

## Endpoint

`POST /graphql` (and `GET /graphql` for introspection / Apollo Sandbox in dev).

## Auth contract

Authentication is via `Authorization: Bearer <token>`. The GraphQL context resolves the actor from a next-auth session JWT (JWE encrypted with `NEXTAUTH_SECRET`):

| Token shape | Resolution | Actor source |
|---|---|---|
| next-auth session JWT | `decodeSessionJwt()` in `src/lib/jwt.ts` (jose + hkdf — avoids next-auth peer-dep duplication) | `"session"` |

Missing or malformed `Authorization` → `actor: null`. Public schema fields and `/health` proceed; resolvers requiring auth throw `GraphQLError` with the appropriate `extensions.code`.

### Resolver auth pattern

Every resolver that needs auth follows this pattern (modeled on `Query.me` in `src/graphql/queries/UserQueries.ts`):

```ts
import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../context";

myResolver: async (_parent, args, ctx: GraphQLContext) => {
  if (!ctx.actor) {
    throw new GraphQLError("Unauthenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return client.someModel.findUnique({ where: { id: args.id } });
}
```

**Error code map:**

| Apollo `extensions.code` | When to throw | HTTP equivalent |
|---|---|---|
| `UNAUTHENTICATED` | No `ctx.actor` (no valid Bearer JWT) | 401 |
| `FORBIDDEN` | actor exists but lacks required role | 403 |
| `NOT_FOUND` | requested entity doesn't exist | 404 |
| `BAD_USER_INPUT` | input validation failure | 400 |
| `INTERNAL_SERVER_ERROR` | unexpected — let Apollo default into this | 500 |

Use `GraphQLError` from `graphql`, not Apollo Server's `ApolloError` (deprecated in v4).

### How the dashboard/app forwards JWTs

The browser-side Apollo client can't read the next-auth session cookie directly — it's `httpOnly`. The flow:

1. Apollo's auth link calls a server-side route (e.g. `/api/auth/session-token`)
2. That route uses `getToken({ req, secret, raw: true })` to extract the encoded JWT
3. Apollo includes it as `Authorization: Bearer <jwt>` on every GraphQL request
4. apps/api receives the request, `context.ts` decodes via `NEXTAUTH_SECRET`, populates `ctx.actor`
5. Resolver reads `ctx.actor` and gates accordingly

For tests: mock `ctx.actor` directly.

## Code conventions

### Resolver layout

`src/graphql/queries/` and `src/graphql/mutations/` — one file per resource (`UserQueries.ts`, `TodoMutations.ts`, etc.). Each file exports a `Query` or `Mutation` object whose keys are stitched into `resolvers` in `src/graphql/index.ts`.

`src/graphql/types/` — type-resolvers (field resolvers attached to schema types like `User.role`, `User.todos`). Stitched into the same resolver map. See `User.ts` for the canonical pattern.

Type defs live in `src/graphql/type-defs/` as `.graphql` files. `@graphql-codegen` produces typed resolver signatures in `__generated__/types.ts`.

### Codegen

`pnpm codegen` at repo root regenerates `apps/api/src/graphql/__generated__/types.ts` from the `.graphql` files. New resolvers opt into strict typing by annotating themselves as `Resolvers["Query"]["myField"]`. The default index signature keeps existing untyped stub resolvers compiling.

`pnpm codegen:check` re-runs codegen and fails on any diff — wire this into CI to enforce "regenerate before commit."

## Observability — Sentry

When `SENTRY_DSN` is set, the service initialises Sentry on boot and registers an Express error handler that captures **both 5xx and 4xx errors**. Set per-environment in the hosting provider's env config; leave unset locally for silent no-op.

### Why 4xx capture is on

The default Sentry behaviour only reports errors with status >= 500. For an auth-gated admin API, the 4xx signals are usually the ones worth seeing:

- body-parser `SyntaxError` from malformed JSON request bodies
- Malformed bearer tokens or expired sessions
- Permission denials that surface real misconfiguration

The override is one line in `src/index.ts`:

```ts
Sentry.setupExpressErrorHandler(app, {
  shouldHandleError: () => true,
});
```

### Boot order

`src/instrument.ts` initialises Sentry. It must be imported **first** in `src/index.ts` — before express, before any application module — so the SDK's auto-instrumentation can wrap `http` and `express` at import time:

```ts
import "./instrument";  // line 1
import express from "express";
// ...
```

### Release tagging

`instrument.ts` reads `RAILWAY_GIT_COMMIT_SHA` or `VERCEL_GIT_COMMIT_SHA` and tags every event with it as the `release`. Stack traces in Sentry deep-link back to the exact commit.

## Health endpoint

`GET /health` returns `{ ok, version, gitSha, env }`. Always 200 if the process is up — independent of DB, downstream services, or auth. Used by Railway's healthcheck (failed deploys are rolled back automatically) and any external monitoring.

`gitSha` reads `RAILWAY_GIT_COMMIT_SHA` (Railway injects this) or `GIT_SHA` if set manually.

## Required env vars

| Variable | Source | Required for |
|---|---|---|
| `DATABASE_URL` | Neon pooled URL | All DB access |
| `DIRECT_URL` | Neon direct URL | Migrations |
| `NEXTAUTH_SECRET` | **Same value as dashboard/app's Vercel env** | Session-JWT auth path |

If `NEXTAUTH_SECRET` is unset or doesn't match the value set on the Vercel apps, every GraphQL request returns `UNAUTHENTICATED` — the api can't decode the dashboard's session JWT. This is a silent failure mode; verify match early.

## Optional env vars

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Listen port (Railway injects automatically) |
| `SENTRY_DSN` | unset | Error reporting |
| `NODE_ENV` | unset | Sentry environment tag + Apollo Sandbox gate |
| `PRIVATE_KEY` | required by legacy utils | Legacy JWT path (jsonwebtoken). Remove once legacy resolvers are deleted. |

## Local dev

```bash
pnpm dev
# nodemon → ts-node src/index.ts on PORT 4000
```

In dev, Apollo Sandbox renders at `http://localhost:4000/graphql` for ad-hoc query exploration.

## Deploy

Railway service. Configured via `apps/api/railway.json`:

- Builder: `DOCKERFILE` (path `apps/api/Dockerfile`)
- Healthcheck path: `/health` (200 required)
- Restart policy: `ON_FAILURE`, max 5 retries

### Future deployment notes (when this template's create-app pipeline provisions apps/api)

This template's `apps/api` service is configured to deploy on Railway but is **not currently auto-provisioned** by the platform's create-app worker — that workflow today only deploys `apps/app` (Vercel), `apps/dashboard` (Vercel), and `apps/worker` (Railway). When the create-app pipeline is extended to provision `apps/api`, the following needs to happen:

1. **Railway service** created from `apps/api/Dockerfile` + `apps/api/railway.json` (a `provisionRailwayApi` helper in the platform's worker).
2. **Env vars forwarded** to the new Railway api service: `DATABASE_URL`, `DIRECT_URL` (Neon, already generated), `NEXTAUTH_SECRET` (**must match** the value set on the spawned app's Vercel projects — Vercel/Railway secret mismatch silently breaks GraphQL auth), `SENTRY_DSN` (from auto-provisioned Sentry project), `NODE_ENV=production`.
3. **`NEXT_PUBLIC_BACKEND_URL`** on Vercel apps/app + apps/dashboard updated from the current default (`${appUrl}/api`, a Vercel-internal path) to the Railway api URL (e.g. `https://<slug>-api.up.railway.app/graphql`). The current default works as long as the consuming apps host their own `/api/graphql` routes; once they call out to the Railway service instead, this must point there.

Until those happen, this `apps/api` exists in the template as scaffolding only — its Sentry SDK, GraphQL schema, and auth context are wired correctly, but no spawned app routes traffic to it.

## Tests

```bash
pnpm test
# vitest run
```
