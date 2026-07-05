import { describe, expect, it } from "vitest";
import { prisma } from "@jobscheduler/db";
import { executeJob } from "../execution";
import { registerHandler } from "../handlers/registry";
import { createOrgProjectQueue, createWorker, createJob } from "../test-utils/fixtures";

registerHandler("always-fails", async () => {
  throw new Error("boom");
});

describe("retry escalation and dead-lettering", () => {
  it("schedules retries with FIXED backoff, then moves to DEAD_LETTER once maxRetries is exceeded", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    let job = await createJob(queue.id, {
      jobType: "always-fails",
      maxRetries: 2,
      backoffStrategy: "FIXED",
      baseDelaySeconds: 10,
    });

    await executeJob(job, worker.id);
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(job.status).toBe("SCHEDULED");
    expect(job.retryCount).toBe(1);
    expect(job.nextRetryAt!.getTime() - Date.now()).toBeGreaterThan(5000);
    expect(job.nextRetryAt!.getTime() - Date.now()).toBeLessThan(15000);

    await executeJob(job, worker.id);
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(job.status).toBe("SCHEDULED");
    expect(job.retryCount).toBe(2);

    // Third failure exceeds maxRetries (2) - moves to the dead letter queue.
    await executeJob(job, worker.id);
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(job.status).toBe("DEAD_LETTER");
    expect(job.retryCount).toBe(3);
    expect(job.lastError).toBe("boom");

    const dlqEntry = await prisma.deadLetterEntry.findUnique({ where: { jobId: job.id } });
    expect(dlqEntry).not.toBeNull();
    expect(dlqEntry!.reason).toContain("2");
    expect(dlqEntry!.finalError).toBe("boom");
    expect(dlqEntry!.resolvedAt).toBeNull();

    const executions = await prisma.jobExecution.findMany({
      where: { jobId: job.id },
      orderBy: { attemptNumber: "asc" },
    });
    expect(executions.map((e) => e.status)).toEqual(["FAILED", "FAILED", "FAILED"]);
  });

  it("computes EXPONENTIAL backoff delays that roughly double each retry", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    let job = await createJob(queue.id, {
      jobType: "always-fails",
      maxRetries: 5,
      backoffStrategy: "EXPONENTIAL",
      baseDelaySeconds: 10,
    });

    await executeJob(job, worker.id);
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    const firstDelay = job.nextRetryAt!.getTime() - Date.now();
    expect(firstDelay).toBeGreaterThan(5000);
    expect(firstDelay).toBeLessThan(15000); // ~10s

    await executeJob(job, worker.id);
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    const secondDelay = job.nextRetryAt!.getTime() - Date.now();
    expect(secondDelay).toBeGreaterThan(15000);
    expect(secondDelay).toBeLessThan(25000); // ~20s
  });

  it("never exceeds maxDelaySeconds even with EXPONENTIAL growth", async () => {
    const { queue } = await createOrgProjectQueue();
    const worker = await createWorker();
    let job = await createJob(queue.id, {
      jobType: "always-fails",
      maxRetries: 10,
      backoffStrategy: "EXPONENTIAL",
      baseDelaySeconds: 100,
      maxDelaySeconds: 150,
      retryCount: 9, // simulate a job already deep into its retry schedule
    });

    await executeJob(job, worker.id);
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    const delay = job.nextRetryAt!.getTime() - Date.now();
    expect(delay).toBeLessThanOrEqual(151_000);
    expect(delay).toBeGreaterThan(145_000);
  });
});
