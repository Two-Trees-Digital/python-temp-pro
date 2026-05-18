// Environment-context helpers + Zod-based env validation.
//
// Two responsibilities:
//   1. Deploy-context detection — isLocal / isPreview / marketingAppUrl /
//      dashboardUrl. Client + server safe.
//   2. Env-var validation — validateEnv(schema) parses process.env and throws
//      a bullet-list of every missing/invalid var. Per-app schemas extend a
//      generic base.
//
// Defaults are deliberately generic for the template — apps provisioned from
// this template need to set NEXT_PUBLIC_APP_URL / NEXTAUTH_URL on their
// Vercel projects with their own domains. The fallback placeholders below
// will fail loudly in the browser if the env vars are unset, which is the
// right behavior — better than silent breakage.

import { z, ZodError, ZodSchema } from "zod";

declare const process: { env: Record<string, string | undefined> };

// ── Env validation ───────────────────────────────────────────────────────────

function formatValidationError(error: ZodError): string {
  const errorLines = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `    • ${path} — ${issue.message}`;
  });
  return `❌ Environment validation failed:\n${errorLines.join("\n")}`;
}

/** Parse `process.env`; throws a bullet-list of every missing/invalid var. */
export function validateEnv<T extends ZodSchema>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new Error(formatValidationError(result.error));
  }
  return result.data;
}

/** Alias for {@link validateEnv}. */
export function createEnv<T extends ZodSchema>(schema: T): z.infer<T> {
  return validateEnv(schema);
}

// ── Base schemas — apps extend with their own required vars ──────────────────

const sentrySchema = {
  SENTRY_DSN: z.string().optional(),
};

/**
 * Minimum env every app + worker needs. Extend in the consuming app:
 *
 *     import { z } from "zod";
 *     import { baseEnvSchema, validateEnv } from "@repo/env";
 *
 *     const schema = baseEnvSchema.extend({
 *       NEXTAUTH_SECRET: z.string().min(1, "Required"),
 *       NEXTAUTH_URL:    z.string().min(1, "Required"),
 *     });
 *     export const env = validateEnv(schema);
 */
export const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "Required"),
  ...sentrySchema,
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

// ── Deploy-context helpers ───────────────────────────────────────────────────

/**
 * True in local development.
 *
 * Primarily reads NODE_ENV (which Next.js inlines at build time, so this is
 * client + server safe). On the server it also catches the edge case where
 * someone runs a production build (`pnpm start`) but points NEXTAUTH_URL at
 * localhost.
 *
 * On client, the NEXTAUTH_URL fallback is harmlessly absent (server-only env
 * var), so behavior collapses to the NODE_ENV check.
 */
export function isLocal(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return (process.env.NEXTAUTH_URL ?? "").includes("localhost");
}

/**
 * True on Vercel preview deploys.
 *
 * Server-only — VERCEL_ENV is not inlined into the client bundle.
 */
export function isPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * URL of the marketing app (apps/app), context-aware.
 *
 *   local   → http://localhost:3000  (apps/app's `next dev` default port)
 *   other   → NEXT_PUBLIC_APP_URL, or a placeholder fallback
 *
 * Client + server safe.
 */
export function marketingAppUrl(): string {
  if (isLocal()) return "http://localhost:3000";
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";
}

/**
 * URL of the dashboard app (apps/dashboard), context-aware.
 *
 *   local   → http://localhost:3001  (apps/dashboard's `next dev --port 3001`)
 *   other   → NEXTAUTH_URL  (server, canonical)
 *           → NEXT_PUBLIC_DASHBOARD_URL  (client fallback)
 *           → placeholder fallback
 *
 * Client + server safe.
 */
export function dashboardUrl(): string {
  if (isLocal()) return "http://localhost:3001";
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_DASHBOARD_URL ??
    "https://example.com"
  );
}
