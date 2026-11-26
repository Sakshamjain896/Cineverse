import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__cineversePrisma ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["warn", "error"],
  });

if (!env.isProduction) {
  globalForPrisma.__cineversePrisma = prisma;
}

/**
 * Verifies database readiness with a lightweight SELECT 1 query.
 */
export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}

/**
 * Cleanly closes Prisma database connections on server shutdown.
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
