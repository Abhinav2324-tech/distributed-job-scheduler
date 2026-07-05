import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma, WorkerStatus } from "@jobscheduler/db";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";
import { sweep } from "../jobs/deadWorkerSweeper";

const app = createApp();

async function setupQueueWithJob(token: string) {
  const project = await request(app)
    .post("/api/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Proj" });
  const queue = await request(app)
    .post(`/api/projects/${project.body.id}/queues`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "default" });
  const job = await request(app)
    .post(`/api/queues/${queue.body.id}/jobs`)
    .set("Authorization", `Bearer ${token}`)
    .send({ jobType: "email" });
  return { queue: queue.body, job: job.body.job };
}

describe("dead worker sweeper", () => {
  it("marks a worker with a stale heartbeat as DEAD and releases its in-flight jobs back to QUEUED", async () => {
    const { token } = await registerTestUser(app);
    const { job } = await setupQueueWithJob(token);

    const worker = await prisma.worker.create({
      data: {
        hostname: "stale-host",
        pid: 1234,
        queueNames: [],
        concurrency: 5,
        status: WorkerStatus.ALIVE,
        lastHeartbeatAt: new Date(Date.now() - 60_000),
      },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "CLAIMED", claimedByWorkerId: worker.id, claimedAt: new Date() },
    });

    await sweep(15_000);

    const refreshedWorker = await prisma.worker.findUniqueOrThrow({ where: { id: worker.id } });
    expect(refreshedWorker.status).toBe(WorkerStatus.DEAD);

    const refreshedJob = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(refreshedJob.status).toBe("QUEUED");
    expect(refreshedJob.claimedByWorkerId).toBeNull();
    expect(refreshedJob.claimedAt).toBeNull();
  });

  it("leaves workers with a recent heartbeat untouched", async () => {
    const worker = await prisma.worker.create({
      data: {
        hostname: "healthy-host",
        pid: 5678,
        queueNames: [],
        concurrency: 5,
        status: WorkerStatus.ALIVE,
        lastHeartbeatAt: new Date(),
      },
    });

    await sweep(15_000);

    const refreshed = await prisma.worker.findUniqueOrThrow({ where: { id: worker.id } });
    expect(refreshed.status).toBe(WorkerStatus.ALIVE);
  });

  it("does not touch jobs claimed by a still-healthy worker even if other workers are dead", async () => {
    const { token } = await registerTestUser(app);
    const { job } = await setupQueueWithJob(token);

    const healthyWorker = await prisma.worker.create({
      data: {
        hostname: "healthy",
        pid: 1,
        queueNames: [],
        concurrency: 5,
        status: WorkerStatus.ALIVE,
        lastHeartbeatAt: new Date(),
      },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "RUNNING", claimedByWorkerId: healthyWorker.id, claimedAt: new Date() },
    });

    await sweep(15_000);

    const refreshedJob = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(refreshedJob.status).toBe("RUNNING");
    expect(refreshedJob.claimedByWorkerId).toBe(healthyWorker.id);
  });
});
