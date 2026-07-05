import { claimJobs, prisma } from "@jobscheduler/db";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { resolveQueueIds } from "./lib/queueResolver";
import { executeJob } from "./execution";

export interface PollLoop {
  start(): void;
  /** Stops claiming new jobs; jobs already in flight keep running. */
  stopClaiming(): void;
  getInFlightJobIds(): string[];
  getInFlightCount(): number;
  /** Resolves once all currently in-flight jobs finish, or timeoutMs elapses - whichever first. */
  waitForInFlight(timeoutMs: number): Promise<void>;
}

export function createPollLoop(workerId: string): PollLoop {
  const inFlight = new Map<string, Promise<void>>();
  let timer: NodeJS.Timeout | undefined;
  let claimingStopped = false;

  async function tick(): Promise<void> {
    if (claimingStopped) return;

    const capacity = env.WORKER_CONCURRENCY - inFlight.size;
    if (capacity <= 0) return;

    const queueIds = await resolveQueueIds();
    if (queueIds.length === 0) return;

    const jobs = await claimJobs(prisma, { queueIds, workerId, limit: capacity });
    for (const job of jobs) {
      const promise = executeJob(job, workerId)
        .catch((err) => logger.error({ err, jobId: job.id }, "Unexpected error running job"))
        .finally(() => {
          inFlight.delete(job.id);
        });
      inFlight.set(job.id, promise);
    }
  }

  return {
    start() {
      timer = setInterval(() => {
        tick().catch((err) => logger.error({ err }, "Poll tick failed"));
      }, env.WORKER_POLL_INTERVAL_MS);
    },
    stopClaiming() {
      claimingStopped = true;
      if (timer) clearInterval(timer);
    },
    getInFlightJobIds() {
      return Array.from(inFlight.keys());
    },
    getInFlightCount() {
      return inFlight.size;
    },
    async waitForInFlight(timeoutMs: number) {
      if (inFlight.size === 0) return;
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      await Promise.race([Promise.all(Array.from(inFlight.values())), timeout]);
    },
  };
}
