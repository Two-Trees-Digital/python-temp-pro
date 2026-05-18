// Type pass-through for the `database/client` entry point.
// Mirrors client.js — re-exports every type from the Prisma generated client.
//
// TypeScript looks up `database/client` via the `exports` map in
// package.json and lands here for `.types`, while client.js handles runtime.
export * from "../../apps/app/generated/client";
