# `logger`

Thin logging wrapper. Routes `info` / `warn` / `error` through `console.*` for stdout capture, and forwards `error` calls to Sentry when `SENTRY_DSN` is set. Single source of truth so apps don't drift on log shape.

## Usage

```ts
import { logger } from "@repo/logger";

logger.info("created app", { appId, name });
logger.warn("rate-limited", { userId });
logger.error("provision failed", err, { jobId });
```

The optional third arg is structured context — strings, numbers, IDs. Don't pass raw objects with secrets or large payloads; they end up in Sentry tags and on log streams.

## Patterns

### Debug suppression in prod

`logger.debug` only writes when `NODE_ENV !== "production"`. Useful for tracing without spamming Vercel / Railway logs at scale.

### Sentry forwarding

If `SENTRY_DSN` is set in the consumer's env, `logger.error` calls `Sentry.captureException(err, { extra: context })`. If not, errors still go to console — Sentry just isn't notified. Consumers (dashboard, worker, api) initialize Sentry in their own `instrument.ts` before importing this package; the logger doesn't init Sentry itself.

### Where to use logger vs console

Use `logger` for anything that should go to Sentry (errors with context) or that we'd want to grep in production. Use `console.log` for local-dev debug spew you intend to delete.
