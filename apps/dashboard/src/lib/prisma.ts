// The Prisma client is generated into apps/app/generated/client by the
// database package's build/db:generate script. Both the app and dashboard
// import from the same generated client so they share the same Prisma schema.
import { PrismaClient } from "../../../app/generated/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
