import { describe, expect, it } from "vitest";
import { prisma } from "@jobscheduler/db";
import { executeJob } from "../execution";
import { registerHandler } from "../handlers/registry";
import { createOrgProjectQueue, createWorker, createJob } from "../test-utils/fixtures";

// Deterministic test handlers, registered once - the demo handlers
// (email/report-generation/data-sync) have a random failure chance, which
// would make these tests flaky.
registerHandler("test-success", async (_payload, ctx) => {
  ctx.log("doing work");
});
registerHandler("test-failure", async () => {
  throw new Error("boom");
});

describe("executeJob", () => {
  it("marks a job COMPLETED and records a COMPLETED execution with duration on success", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    const job = await createJob(queue.id, { jobType: "test-success" });

    await executeJob(job, worker.id);

    const updatedJob = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob.status).toBe("COMPLETED");
    expect(updatedJob.completedAt).not.toBeNull();

    const executions = await prisma.jobExecution.findMany({ where: { jobId: job.id } });
    expect(executions).toHaveLength(1);
    expect(executions[0]!.status).toBe("COMPLETED");
    expect(executions[0]!.attemptNumber).toBe(1);
    expect(executions[0]!.durationMs).not.toBeNull();
    expect(executions[0]!.workerId).toBe(worker.id);

    const logs = await prisma.jobLog.findMany({ where: { jobExecutionId: executions[0]!.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.message).toBe("doing work");
  });

  it("schedules a retry (does not rest at FAILED) when the handler throws and retries remain", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    const job = await createJob(queue.id, { jobType: "test-failure" });

    await executeJob(job, worker.id);

    // Job.status never rests at FAILED - the claim query only selects
    // QUEUED/SCHEDULED, so a job awaiting retry must be SCHEDULED (see
    // retry.ts for why). Full retry escalation is covered in retry.test.ts.
    const updatedJob = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob.status).toBe("SCHEDULED");
    expect(updatedJob.retryCount).toBe(1);
    expect(updatedJob.lastError).toBe("boom");
    expect(updatedJob.failedAt).not.toBeNull();
    expect(updatedJob.nextRetryAt).not.toBeNull();
    expect(updatedJob.runAt).toEqual(updatedJob.nextRetryAt);

    const executions = await prisma.jobExecution.findMany({ where: { jobId: job.id } });
    expect(executions).toHaveLength(1);
    expect(executions[0]!.status).toBe("FAILED");
    expect(executions[0]!.errorMessage).toBe("boom");
  });

  it("schedules a retry for a job whose jobType has no registered handler", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    const job = await createJob(queue.id, { jobType: "no-such-handler" });

    await executeJob(job, worker.id);

    const updatedJob = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob.status).toBe("SCHEDULED");
    expect(updatedJob.lastError).toContain("No handler registered");
  });

  it("increments attemptNumber across repeated executions of the same job", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    const job = await createJob(queue.id, { jobType: "test-failure" });

    await executeJob(job, worker.id);
    await executeJob(job, worker.id);

    const executions = await prisma.jobExecution.findMany({
      where: { jobId: job.id },
      orderBy: { attemptNumber: "asc" },
    });
    expect(executions.map((e) => e.attemptNumber)).toEqual([1, 2]);
  });
});
