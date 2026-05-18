// Secondary entry point for the Prisma generated client.
//
// The Prisma schema's `output` config writes the client to
// apps/app/generated/client (historical — predates this package being
// importable as a workspace dep). This file is a thin CJS pass-through
// so consumers can `import { PrismaClient } from "database/client"`
// without knowing the generated path.
//
// `database/client` works at runtime AND for type imports — see the
// `exports` map in package.json + the sibling client.d.ts file.
//
// Future cleanup: relocate the Prisma output into packages/database/generated/
// so this file becomes `module.exports = require("./generated/client")`.
module.exports = require("../../apps/app/generated/client");
