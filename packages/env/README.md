# `env`

Workspace package for env-var validation (Zod schemas) and deploy-context detection (`isLocal`, `isPreview`, URL builders). Consumed by every app + worker so the env contract lives in one place.

## Exports

### Schema validation

```ts
import { z } from "zod";
import { baseEnvSchema, validateEnv } from "@repo/env";

const schema = baseEnvSchema.extend({
  NEXTAUTH_SECRET: z.string().min(1, "Required"),
  NEXTAUTH_URL:    z.string().min(1, "Required"),
});

export const env = validateEnv(schema);
```

`validateEnv` parses `process.env` against a Zod schema. On failure it throws with a bullet-list error message naming every missing/invalid variable. `createEnv` is an alias.

`baseEnvSchema` requires `DATABASE_URL` and accepts optional `SENTRY_DSN`. Apps extend it with their own required vars (NEXTAUTH_*, REDIS_URL, etc.).

### Deploy-context helpers

| Helper | Returns | Notes |
|---|---|---|
| `isLocal()` | `true` in dev | Reads `NODE_ENV` (inlined by Next at build time → client + server safe). Server-side also accepts the edge case where someone runs `pnpm start` against a localhost `NEXTAUTH_URL`. |
| `isPreview()` | `true` on Vercel preview deploys | Server-only — `VERCEL_ENV` isn't bundled into the client. |
| `marketingAppUrl()` | URL of `apps/app` | `localhost:3000` in dev, else `NEXT_PUBLIC_APP_URL`, else the placeholder. |
| `dashboardUrl()` | URL of `apps/dashboard` | `localhost:3001` in dev. Else `NEXTAUTH_URL` (server) → `NEXT_PUBLIC_DASHBOARD_URL` (client fallback) → placeholder. |

### Pattern: where to put env logic

If you find yourself reading `process.env.NODE_ENV` or constructing a localhost-vs-prod URL in three places, lift it here. The package exists to prevent that drift.
