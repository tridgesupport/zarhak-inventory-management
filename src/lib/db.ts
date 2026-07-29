import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

// Neon's serverless driver talks to Neon's own WebSocket proxy, so it only works
// against a real Neon database. Local/non-Neon Postgres (dev, CI) uses the plain
// node-postgres adapter instead — picked automatically from the connection string.
function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const isNeon = connectionString.includes("neon.tech");
  return isNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
