import { Router } from "express";
import { prisma } from "@jobscheduler/db";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable", timestamp: new Date().toISOString() });
  }
});
