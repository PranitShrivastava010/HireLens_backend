import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

const enableSlowQueryLogging = process.env.LOG_PRISMA_QUERIES === "true";
const slowQueryThresholdMs = Number(process.env.LOG_PRISMA_QUERY_MS ?? 250);

const createPrismaClient = () => {
  const client = new PrismaClient(
    enableSlowQueryLogging
      ? {
          log: [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "warn" },
            { emit: "stdout", level: "error" },
          ],
        }
      : undefined
  );

  if (enableSlowQueryLogging) {
    client.$on("query", (event: Prisma.QueryEvent) => {
      if (event.duration >= slowQueryThresholdMs) {
        console.warn(
          `[prisma] slow query ${event.duration}ms :: ${event.query.replace(/\s+/g, " ").trim()}`
        );
      }
    });
  }

  return client;
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
