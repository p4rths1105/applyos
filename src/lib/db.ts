import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 uses a driver adapter. Singleton so Next.js dev hot-reload doesn't
// open a new pool on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function make(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? make();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
