/**
 * One-off script to list and update app URLs in the database.
 * Run with: node scripts/fix-app-urls.mjs
 *
 * TEMPLATE NOTE: the `urlFixes` array is EMPTY by default. Adapt per
 * project — add entries that map vercel.app auto-URLs to your custom
 * domains. See the commented example below.
 */
import { PrismaClient } from "../apps/app/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  // 1. Show current state
  const apps = await prisma.app.findMany({
    select: { id: true, name: true, appUrl: true, dashUrl: true, status: true },
    orderBy: { name: "asc" },
  });

  console.log("\nCurrent app URLs:\n");
  apps.forEach(a =>
    console.log(`  [${a.status}] ${a.name}\n    appUrl:  ${a.appUrl ?? "(none)"}\n    dashUrl: ${a.dashUrl ?? "(none)"}`)
  );

  // 2. Edit this array per-project. Each entry specifies a match function
  //    (returns true if a URL should be replaced) and either appUrl or
  //    dashUrl (the replacement).
  //
  //    Example for a hypothetical app:
  //      const urlFixes = [
  //        {
  //          match:  (url) => url?.includes("my-app.vercel.app"),
  //          appUrl: "https://www.mydomain.com",
  //        },
  //        {
  //          match:   (url) => url?.includes("my-app-dashboard.vercel.app"),
  //          dashUrl: "https://dashboard.mydomain.com",
  //        },
  //      ];
  const urlFixes = [];

  let changed = 0;
  for (const app of apps) {
    let update = {};
    for (const fix of urlFixes) {
      if (fix.appUrl  && fix.match(app.appUrl))  update.appUrl  = fix.appUrl;
      if (fix.dashUrl && fix.match(app.dashUrl)) update.dashUrl = fix.dashUrl;
    }
    if (Object.keys(update).length > 0) {
      await prisma.app.update({ where: { id: app.id }, data: update });
      console.log(`\n✓ Updated "${app.name}":`, update);
      changed++;
    }
  }

  if (changed === 0) {
    console.log("\nNo fixes applied — either urlFixes is empty (template default) or no URLs matched.");
    console.log("Edit the urlFixes array in this script per your project's URLs.");
  }

  console.log("\nDone.\n");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
