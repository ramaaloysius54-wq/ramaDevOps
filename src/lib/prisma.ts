import { PrismaClient } from "@prisma/client";

declare global {
  var globalPrisma: PrismaClient | undefined;
}

// FIX: Hapus "query" dari log agar terminal bersih dari tulisan INSERT/SELECT
export const prisma =
  global.globalPrisma ||
  new PrismaClient({
    log: ["error", "warn"], 
  });

if (process.env.NODE_ENV !== "production") {
  global.globalPrisma = prisma;
}

export default prisma;
