import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient instance. Both the API and the worker import
// this rather than constructing their own client, so connection pooling
// behaves predictably in dev (hot-reload safe) and in tests.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export * from "@prisma/client";
export * from "./claim";
