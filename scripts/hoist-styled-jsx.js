/**
 * Copies styled-jsx from the pnpm store to root node_modules as REAL files
 * (not symlinks) so Vercel's Lambda file tracer can bundle them correctly.
 *
 * pnpm creates node_modules/styled-jsx as a symlink. Symlinks don't survive
 * Vercel's Lambda packaging. This script always overwrites with real files.
 *
 * Ported from two-trees-digital-new (see CLAUDE.md §5.1 for the full outage
 * story). Without this script, apps using `sass` or other Next.js peer deps
 * that add @babel/core to the Next.js resolution path will silently crash
 * in production Lambdas with `Cannot find module 'styled-jsx/package.json'`.
 *
 * No-op when styled-jsx isn't in the pnpm store (e.g. worker Docker image
 * during install) — logs a warning and exits 0.
 */
const { cpSync, rmSync, lstatSync, existsSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");

const root = join(__dirname, "..");
const dest = join(root, "node_modules", "styled-jsx");

// Always remove and re-copy — pnpm may have put a symlink there
if (existsSync(dest)) {
  try {
    const stat = lstatSync(dest);
    if (stat.isSymbolicLink()) {
      console.log("[hoist-styled-jsx] removing pnpm symlink at node_modules/styled-jsx");
      rmSync(dest, { recursive: true, force: true });
    } else {
      console.log("[hoist-styled-jsx] real directory already present — replacing to ensure freshness");
      rmSync(dest, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn("[hoist-styled-jsx] could not remove existing:", e.message);
  }
}

try {
  const found = execSync(
    'find node_modules/.pnpm -maxdepth 4 -name "package.json" -path "*/styled-jsx/package.json" 2>/dev/null | head -1',
    { cwd: root }
  )
    .toString()
    .trim();

  if (!found) {
    console.warn("[hoist-styled-jsx] styled-jsx not found in pnpm store — skipping");
    process.exit(0);
  }

  const src = join(root, found.replace("/package.json", ""));
  cpSync(src, dest, { recursive: true });
  console.log(`[hoist-styled-jsx] copied real files: ${src} → ${dest}`);
} catch (e) {
  console.warn("[hoist-styled-jsx] failed (non-fatal):", e.message);
}
