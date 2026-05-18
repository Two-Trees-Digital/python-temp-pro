#!/usr/bin/env node
// TT-118: tiny env-loading wrapper for build scripts.
//
// Loads the workspace-root .env (if present) into process.env, then execs
// the rest of argv as a single shell command. Two reasons this exists:
//
//   1. Per-app build scripts run prisma migrate deploy, and Prisma's CLI
//      reads .env from CWD, NOT from the --schema directory. Without this,
//      `pnpm build --filter dashboard` fails locally with
//      "Environment variable not found: DIRECT_URL" because apps/dashboard
//      has no .env of its own.
//
//   2. In CI / Vercel, env vars come from the runner — there's no .env
//      file. The existsSync check makes this a clean no-op there.
//
// Usage in package.json:
//   "build": "node ../../scripts/with-root-env.cjs 'tsc ... && prisma migrate deploy ... && next build'"
//
// The single-quoted argument means the shell hands the entire chain to us
// as ONE string; we then spawn a sub-shell so the && chain runs in a single
// process with the loaded env.

const { existsSync } = require("node:fs");
const { resolve }    = require("node:path");
const { spawn }      = require("node:child_process");

const envPath = resolve(__dirname, "..", ".env");
if (existsSync(envPath)) {
  // Lazy require so this still works in environments where dotenv isn't
  // installed but env vars are pre-set externally.
  try {
    require("dotenv").config({ path: envPath });
  } catch (err) {
    console.warn(`[with-root-env] dotenv not installed; skipping ${envPath}`);
  }
}

const command = process.argv.slice(2).join(" ");
if (!command) {
  console.error("Usage: with-root-env.cjs <shell command...>");
  process.exit(2);
}

const child = spawn(command, {
  stdio: "inherit",
  env:   process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 1));
