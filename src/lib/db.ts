import { PrismaClient } from "@prisma/client";

// Singleton para evitar múltiples conexiones en desarrollo con HMR.
// En producción serverless (Vercel) cada invocación puede tener su propio
// contexto global, por lo que se limita connection_limit=1 para no agotar
// el pool de Supabase.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
