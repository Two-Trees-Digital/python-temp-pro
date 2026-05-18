import { PrismaClient } from "../../generated/client";

// Prevent multiple PrismaClient instances in development (hot reload creates new modules)
// In production (Vercel serverless) each function invocation gets a fresh module anyway.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
