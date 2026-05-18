/**
 * Shared logger. error/warn/info forward to Sentry when SENTRY_DSN is set;
 * debug is console-only and suppressed in production.
 */

import * as Sentry from "@sentry/node";

const isSentryEnabled = !!process.env.SENTRY_DSN;

/** Extra context attached to log calls (e.g. { orderId, userId }). */
type LogContext = Record<string, unknown>;

/** Capture an error. Accepts an Error or a string message. */
function error(errorOrMessage: Error | string, context?: LogContext): void {
  const err =
    typeof errorOrMessage === "string"
      ? new Error(errorOrMessage)
      : errorOrMessage;

  console.error(`[ERROR] ${err.message}`, context ?? "");

  if (isSentryEnabled) {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setExtras(context);
        Sentry.captureException(err);
      });
    } else {
      Sentry.captureException(err);
    }
  }
}

/** Capture a warning-level message. */
function warn(message: string, context?: LogContext): void {
  console.warn(`[WARN] ${message}`, context ?? "");

  if (isSentryEnabled) {
    if (context) {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setExtras(context);
        Sentry.captureMessage(message);
      });
    } else {
      Sentry.captureMessage(message, "warning");
    }
  }
}

/** Info log + Sentry breadcrumb (not captured as an event). */
function info(message: string, context?: LogContext): void {
  console.log(`[INFO] ${message}`, context ?? "");

  if (isSentryEnabled) {
    Sentry.addBreadcrumb({
      message,
      level: "info",
      data: context,
    });
  }
}

/** Debug log. Console only, suppressed in production. */
function debug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[DEBUG] ${message}`, context ?? "");
  }
}

export const logger = { error, warn, info, debug };
