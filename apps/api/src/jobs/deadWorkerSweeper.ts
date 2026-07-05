import { prisma, WorkerStatus } from "@jobscheduler/db";
import { logger } from "../lib/logger";

/**
 * Detects workers whose heartbeat has gone stale (crashed, killed -9, lost
 * network - anything that skipped the worker's own graceful-shutdown
 * release path) and reclaims their in-flight jobs. This is the counterpart
 * to the worker's own shutdown handler: that one releases jobs when a
 * worker exits cleanly; this one releases jobs when a worker did *not*
 * exit cleanly, based purely on the absence of recent heartbeats.
 */
export function startDeadWorkerSweeper(intervalMs: number, thresholdMs: number): NodeJS.Timeout {
  return setInterval(() => {
    sweep(thresholdMs).catch((err) => logger.error({ err }, "Dead worker sweep failed"));
  }, intervalMs);
}

export async function sweep(thresholdMs: number): Promise<void> {
  const cutoff = new Date(Date.now() - thresholdMs);

  const staleWorkers = await prisma.worker.findMany({
    where: {
      status: { in: [WorkerStatus.ALIVE, WorkerStatus.DRAINING] },
      lastHeartbeatAt: { lt: cutoff },
    },
  });

  for (const worker of staleWorkers) {
    // eslint-disable-next-line no-await-in-loop
    const orphaned = await prisma.job.findMany({
      where: { claimedByWorkerId: worker.id, status: { in: ["CLAIMED", "RUNNING"] } },
      select: { id: true },
    });

    // eslint-disable-next-line no-await-in-loop
    await prisma.$transaction([
      prisma.worker.update({ where: { id: worker.id }, data: { status: WorkerStatus.DEAD } }),
      ...(orphaned.length > 0
        ? [
            prisma.job.updateMany({
              where: { id: { in: orphaned.map((j) => j.id) } },
              data: {
                status: "QUEUED",
                claimedByWorkerId: null,
                claimedAt: null,
                startedAt: null,
              },
            }),
          ]
        : []),
    ]);

    logger.warn(
      { workerId: worker.id, hostname: worker.hostname, orphanedJobCount: orphaned.length },
      "Marked worker dead and released its in-flight jobs",
    );
  }
}
