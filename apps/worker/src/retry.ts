import { prisma, type Job } from "@jobscheduler/db";
import { computeBackoffDelaySeconds } from "./lib/backoff";
import { logger } from "./lib/logger";

export interface FailedExecutionInfo {
  executionId: string;
  finishedAt: Date;
  durationMs: number;
}

/**
 * Decides what happens to a job after a failed attempt, and commits the
 * JobExecution + Job (+ DeadLetterEntry) updates in one transaction.
 *
 * Job.status never rests at FAILED - the claim query (packages/db/src/claim.ts)
 * only ever selects QUEUED/SCHEDULED, so a job awaiting retry must be
 * SCHEDULED (with runAt/nextRetryAt set to the backoff delay) for it to be
 * reclaimable at all. Once retries are exhausted, DEAD_LETTER is the real
 * terminal state, paired with a DeadLetterEntry row. runAt is set to the
 * same value as nextRetryAt specifically so the retry re-uses the exact
 * gating logic the claim query already uses for delayed jobs, rather than
 * requiring any change to that already-proven query.
 */
export async function handleJobFailure(
  job: Job,
  execution: FailedExecutionInfo,
  errorMessage: string,
): Promise<void> {
  const newRetryCount = job.retryCount + 1;
  const exhausted = newRetryCount > job.maxRetries;
  const now = new Date();

  const executionUpdate = prisma.jobExecution.update({
    where: { id: execution.executionId },
    data: {
      status: "FAILED",
      finishedAt: execution.finishedAt,
      durationMs: execution.durationMs,
      errorMessage,
    },
  });

  if (exhausted) {
    await prisma.$transaction([
      executionUpdate,
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: "DEAD_LETTER",
          retryCount: newRetryCount,
          failedAt: now,
          lastError: errorMessage,
        },
      }),
      prisma.deadLetterEntry.create({
        data: {
          jobId: job.id,
          reason: `Exceeded max retries (${job.maxRetries})`,
          finalError: errorMessage,
        },
      }),
    ]);
    logger.warn(
      { jobId: job.id, retryCount: newRetryCount, maxRetries: job.maxRetries },
      "Job moved to dead letter queue",
    );
    return;
  }

  const delaySeconds = computeBackoffDelaySeconds(
    job.backoffStrategy,
    newRetryCount,
    job.baseDelaySeconds,
    job.maxDelaySeconds,
  );
  const nextRetryAt = new Date(now.getTime() + delaySeconds * 1000);

  await prisma.$transaction([
    executionUpdate,
    prisma.job.update({
      where: { id: job.id },
      data: {
        status: "SCHEDULED",
        retryCount: newRetryCount,
        nextRetryAt,
        runAt: nextRetryAt,
        failedAt: now,
        lastError: errorMessage,
      },
    }),
  ]);
  logger.info(
    { jobId: job.id, retryCount: newRetryCount, maxRetries: job.maxRetries, nextRetryAt },
    "Job scheduled for retry",
  );
}
