import { prisma, type Prisma } from "@jobscheduler/db";
import { computeNextRunAt } from "../lib/cron";
import { retryFieldsFromPolicy } from "../lib/retryDefaults";
import { logger } from "../lib/logger";

// Single in-process ticker: fine for one API instance. If the API were ever
// scaled to multiple replicas, this would need to move behind a DB advisory
// lock (or into a dedicated single-instance scheduler process) so two
// replicas don't both materialize the same due ScheduledJob.
export function startCronTicker(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Cron tick failed"));
  }, intervalMs);
}

export async function tick(): Promise<void> {
  const now = new Date();
  const due = await prisma.scheduledJob.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { queue: { include: { retryPolicy: true } } },
  });

  for (const scheduledJob of due) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.$transaction([
      prisma.job.create({
        data: {
          queueId: scheduledJob.queueId,
          scheduledJobId: scheduledJob.id,
          jobType: scheduledJob.jobType,
          payload: (scheduledJob.payloadTemplate ?? {}) as Prisma.InputJsonValue,
          status: "QUEUED",
          ...retryFieldsFromPolicy(scheduledJob.queue.retryPolicy),
        },
      }),
      prisma.scheduledJob.update({
        where: { id: scheduledJob.id },
        data: {
          nextRunAt: computeNextRunAt(scheduledJob.cronExpression, now),
          lastRunAt: now,
        },
      }),
    ]);
  }
}
