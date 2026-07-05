import { createServer } from "http";
import { createApp } from "./app";
import { initSocketServer } from "./lib/socket";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "@jobscheduler/db";
import { startCronTicker } from "./jobs/cronTicker";
import { startDeadWorkerSweeper } from "./jobs/deadWorkerSweeper";
import { startRealtimeBroadcaster } from "./jobs/realtimeBroadcaster";

const app = createApp();
const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "API server listening");
});

const cronTickerTimer = startCronTicker(env.CRON_TICK_INTERVAL_MS);
const deadWorkerSweeperTimer = startDeadWorkerSweeper(
  env.DEAD_WORKER_SWEEP_INTERVAL_MS,
  env.DEAD_WORKER_THRESHOLD_MS,
);
const realtimeBroadcasterTimer = startRealtimeBroadcaster(env.REALTIME_BROADCAST_INTERVAL_MS);

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down API server");
  clearInterval(cronTickerTimer);
  clearInterval(deadWorkerSweeperTimer);
  clearInterval(realtimeBroadcasterTimer);
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
