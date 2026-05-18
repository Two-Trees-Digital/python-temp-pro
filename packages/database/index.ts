// Utility surface of the `database` package.
//
// For the Prisma client + types, use the secondary entry point:
//   import { PrismaClient, User, ... } from "database/client";
//
// This file compiles cleanly to dist/ (rootDir-clean, no cross-package
// imports). Consumers needing prisma value-imports go through "database/client"
// which pass-throughs to the generated location.
export { logActivity } from "./activityLog";
export type { DbClient } from "./activityLog";
