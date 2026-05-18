import * as Sentry from "@sentry/node";

// Initialise Sentry as early as possible — this file is imported FIRST in
// index.ts (before any other module) so SDK instrumentation can wrap http,
// express, etc. on import. Gated on SENTRY_DSN; absent → no-op.

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    // If your deploy provider injects a commit SHA env var, set release here
    // so Sentry can group issues by deploy. Railway injects RAILWAY_GIT_COMMIT_SHA;
    // Vercel injects VERCEL_GIT_COMMIT_SHA; otherwise leave undefined.
    release: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
  });

  // Tag every event with the app slug so the shared Sentry project (set up
  // by the Platform's create-app pipeline) is filterable per-app. APP_SLUG
  // is set on the Railway service by the create-app worker. Falls back to
  // "unknown" if absent (e.g. running locally without the var set).
  Sentry.setTag("app", process.env.APP_SLUG ?? "unknown");
}
