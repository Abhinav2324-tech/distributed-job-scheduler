import { describe, expect, it } from "vitest";
import { prisma, JobStatus } from "../index";
import { claimJobs } from "../claim";
import { createOrgProjectQueue, createJobs, createWorker, createWorkers } from "../test-utils/fixtures";

describe("claimJobs - concurrency correctness", () => {
  it("never claims the same job twice under high concurrent load", async () => {
    const { queue } = await createOrgProjectQueue({ maxConcurrency: 1000 });
    const jobs = await createJobs(queue.id, 100);
    expect(jobs).toHaveLength(100);

    // 20 "workers" racing for the same 100 jobs, each asking for 10 -
    // 200 requested against 100 available.
    const workers = await createWorkers(20);
    const results = await Promise.all(
      workers.map((worker) =>
        claimJobs(prisma, { queueIds: [queue.id], workerId: worker.id, limit: 10 }),
      ),
    );

    const allClaimedIds = results.flat().map((job) => job.id);
    const uniqueClaimedIds = new Set(allClaimedIds);

    expect(allClaimedIds).toHaveLength(100);
    expect(uniqueClaimedIds.size).toBe(100);

    const stillQueued = await prisma.job.count({
      where: { queueId: queue.id, status: JobStatus.QUEUED },
    });
    expect(stillQueued).toBe(0);

    // Every claimed job's DB row must be stamped with the worker that
    // actually received it back, not some other concurrent caller.
    for (const [index, result] of results.entries()) {
      const workerId = workers[index]!.id;
      for (const job of result) {
        // eslint-disable-next-line no-await-in-loop
        const fresh = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
        expect(fresh.claimedByWorkerId).toBe(workerId);
        expect(fresh.status).toBe(JobStatus.CLAIMED);
      }
    }
  });

  it("skips a job locked by another in-flight transaction, then allows it once the lock releases", async () => {
    const { queue } = await createOrgProjectQueue({ maxConcurrency: 1000 });
    const jobs = await createJobs(queue.id, 3);
    const lockedJobId = jobs[0]!.id;
    const [workerA, workerB] = await createWorkers(2);

    let releaseHold: () => void;
    const holdReleased = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });

    const heldTransaction = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM jobs WHERE id::text = ${lockedJobId} FOR UPDATE`;
      await holdReleased;
    });

    // Give the transaction time to actually acquire the row lock before racing it.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const whileLocked = await claimJobs(prisma, {
      queueIds: [queue.id],
      workerId: workerA!.id,
      limit: 10,
    });
    expect(whileLocked.map((j) => j.id)).not.toContain(lockedJobId);
    expect(whileLocked).toHaveLength(2);

    releaseHold!();
    await heldTransaction;

    const afterRelease = await claimJobs(prisma, {
      queueIds: [queue.id],
      workerId: workerB!.id,
      limit: 10,
    });
    expect(afterRelease.map((j) => j.id)).toContain(lockedJobId);
  });
});

describe("claimJobs - queue configuration correctness", () => {
  it("respects maxConcurrency across concurrent claims, capping total claimed regardless of demand", async () => {
    const { queue } = await createOrgProjectQueue({ maxConcurrency: 3 });
    await createJobs(queue.id, 10);
    const workers = await createWorkers(5);

    const results = await Promise.all(
      workers.map((worker) =>
        claimJobs(prisma, { queueIds: [queue.id], workerId: worker.id, limit: 5 }),
      ),
    );
    const totalClaimed = results.flat().length;
    expect(totalClaimed).toBe(3);

    // Capacity is exhausted (3 CLAIMED, none completed) - a further claim gets nothing.
    const followUpWorker = await createWorker();
    const followUp = await claimJobs(prisma, {
      queueIds: [queue.id],
      workerId: followUpWorker.id,
      limit: 10,
    });
    expect(followUp).toHaveLength(0);
  });

  it("does not claim jobs from a paused queue", async () => {
    const { queue } = await createOrgProjectQueue({ isPaused: true });
    await createJobs(queue.id, 5);
    const worker = await createWorker();

    const result = await claimJobs(prisma, { queueIds: [queue.id], workerId: worker.id, limit: 10 });
    expect(result).toHaveLength(0);
  });

  it("does not claim jobs from an archived queue", async () => {
    const { queue } = await createOrgProjectQueue({ archived: true });
    await createJobs(queue.id, 5);
    const worker = await createWorker();

    const result = await claimJobs(prisma, { queueIds: [queue.id], workerId: worker.id, limit: 10 });
    expect(result).toHaveLength(0);
  });

  it("only claims jobs whose runAt is null or already due, ignoring future-scheduled jobs", async () => {
    const { queue } = await createOrgProjectQueue();
    const [dueJob] = await createJobs(queue.id, 1, { runAt: null });
    await createJobs(queue.id, 1, {
      status: JobStatus.SCHEDULED,
      runAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const worker = await createWorker();

    const result = await claimJobs(prisma, { queueIds: [queue.id], workerId: worker.id, limit: 10 });
    expect(result.map((j) => j.id)).toEqual([dueJob!.id]);
  });

  it("claims from higher-priority queues before lower-priority queues when the limit is constraining", async () => {
    const { queue: highPriority } = await createOrgProjectQueue({ priority: 10, maxConcurrency: 100 });
    const { queue: lowPriority } = await createOrgProjectQueue({ priority: 1, maxConcurrency: 100 });
    await createJobs(highPriority.id, 5);
    await createJobs(lowPriority.id, 5);
    const worker = await createWorker();

    const result = await claimJobs(prisma, {
      queueIds: [lowPriority.id, highPriority.id],
      workerId: worker.id,
      limit: 5,
    });

    expect(result).toHaveLength(5);
    expect(result.every((job) => job.queueId === highPriority.id)).toBe(true);
  });

  it("returns an empty array for an empty queueIds list or a non-positive limit", async () => {
    const { queue } = await createOrgProjectQueue();
    await createJobs(queue.id, 3);
    const worker = await createWorker();

    expect(await claimJobs(prisma, { queueIds: [], workerId: worker.id, limit: 10 })).toEqual([]);
    expect(await claimJobs(prisma, { queueIds: [queue.id], workerId: worker.id, limit: 0 })).toEqual([]);
  });
});
