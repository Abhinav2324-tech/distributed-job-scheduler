import { prisma, type Job } from "@jobscheduler/db";
import { getHandler } from "./handlers/registry";
import type { JobHandlerContext } from "./handlers/types";
import { logger } from "./lib/logger";
import { handleJobFailure } from "./retry";

/**
 * Runs one claimed job to completion (or failure) and records the outcome.
 *
 * attemptNumber is derived by counting this job's existing JobExecution
 * rows rather than from job.retryCount. That decouples "which attempt is
 * this" from "how many failures count toward maxRetries" - if a worker
 * dies mid-execution and the job gets released back to QUEUED without its
 * retryCount touched (see index.ts shutdown handling), a later attempt
 * still gets a fresh attemptNumber instead of colliding with the
 * abandoned execution's row on the (jobId, attemptNumber) unique
 * constraint.
 *
 * On failure, what happens next (schedule a retry, or move to the dead
 * letter queue) is delegated to handleJobFailure (see retry.ts).
 */
export async function executeJob(job: Job, workerId: string): Promise<void> {
  const startedAt = new Date();
  const attemptNumber = (await prisma.jobExecution.count({ where: { jobId: job.id } })) + 1;

  const execution = await prisma.jobExecution.create({
    data: { jobId: job.id, attemptNumber, workerId, status: "RUNNING", startedAt },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt },
  });

  const ctx: JobHandlerContext = {
    jobId: job.id,
    attemptNumber,
    log: async (message: string) => {
      try {
        await prisma.jobLog.create({
          data: { jobExecutionId: execution.id, level: "INFO", message },
        });
      } catch (err) {
        logger.error({ err, jobId: job.id }, "Failed to persist job log");
      }
    },
  };

  const handler = getHandler(job.jobType);

  try {
    if (!handler) {
      throw new Error(`No handler registered for job type "${job.jobType}"`);
    }
    await handler(job.payload, ctx);

    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.jobExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: finishedAt },
      }),
    ]);
    logger.info({ jobId: job.id, jobType: job.jobType, attemptNumber }, "Job completed");
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    await handleJobFailure(
      job,
      {
        executionId: execution.id,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
      message,
    );
    logger.warn({ jobId: job.id, jobType: job.jobType, attemptNumber, err: message }, "Job failed");
  }
}
