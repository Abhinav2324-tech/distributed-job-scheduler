import os from "os";
import { prisma, WorkerStatus } from "@jobscheduler/db";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { createPollLoop, type PollLoop } from "./loop";

let workerId: string;
let heartbeatTimer: NodeJS.Timeout | undefined;
let pollLoop: PollLoop;
let shuttingDown = false;

async function registerWorker(): Promise<string> {
  const worker = await prisma.worker.create({
    data: {
      hostname: os.hostname(),
      pid: process.pid,
      queueNames: env.WORKER_QUEUES,
      concurrency: env.WORKER_CONCURRENCY,
      status: WorkerStatus.ALIVE,
    },
  });
  return worker.id;
}

async function sendHeartbeat(): Promise<void> {
  const currentJobCount = pollLoop.getInFlightCount();
  const now = new Date();
  await prisma.$transaction([
    prisma.worker.update({
      where: { id: workerId },
      data: { lastHeartbeatAt: now, currentJobCount },
    }),
    prisma.workerHeartbeat.create({
      data: { workerId, heartbeatAt: now, currentJobCount },
    }),
  ]);
}

async function main() {
  workerId = await registerWorker();
  logger.info(
    { workerId, queues: env.WORKER_QUEUES, concurrency: env.WORKER_CONCURRENCY },
    "Worker registered",
  );

  heartbeatTimer = setInterval(() => {
    sendHeartbeat().catch((err) => logger.error({ err }, "Heartbeat failed"));
  }, env.WORKER_HEARTBEAT_INTERVAL_MS);

  pollLoop = createPollLoop(workerId);
  pollLoop.start();
  logger.info("Worker poll loop started");
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  pollLoop.stopClaiming();

  await prisma.worker.update({
    where: { id: workerId },
    data: { status: WorkerStatus.DRAINING },
  });

  const inFlightCount = pollLoop.getInFlightCount();
  if (inFlightCount > 0) {
    logger.info(
      { count: inFlightCount, graceMs: env.WORKER_SHUTDOWN_GRACE_MS },
      "Waiting for in-flight jobs to finish",
    );
    await pollLoop.waitForInFlight(env.WORKER_SHUTDOWN_GRACE_MS);
  }

  const stillRunning = pollLoop.getInFlightJobIds();
  if (stillRunning.length > 0) {
    logger.warn(
      { jobIds: stillRunning },
      "Grace period elapsed - releasing unfinished jobs back to their queue",
    );
    await prisma.job.updateMany({
      where: { id: { in: stillRunning } },
      data: { status: "QUEUED", claimedByWorkerId: null, claimedAt: null, startedAt: null },
    });
  }

  await prisma.worker.update({
    where: { id: workerId },
    data: { status: WorkerStatus.DEAD },
  });
  await prisma.$disconnect();
  logger.info("Worker shut down cleanly");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  logger.error({ err }, "Worker failed to start");
  process.exit(1);
});
