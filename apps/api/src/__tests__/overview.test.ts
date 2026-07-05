import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma, WorkerStatus } from "@jobscheduler/db";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";

const app = createApp();

describe("overview", () => {
  it("aggregates status counts, worker counts, and throughput scoped to the caller's org", async () => {
    const { token } = await registerTestUser(app);
    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Proj" });
    const queue = await request(app)
      .post(`/api/projects/${project.body.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "default" });

    await request(app)
      .post(`/api/queues/${queue.body.id}/jobs/batch`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobs: [{ jobType: "email" }, { jobType: "email" }, { jobType: "email" }] });

    const jobs = await prisma.job.findMany({ where: { queueId: queue.body.id } });
    await prisma.job.update({
      where: { id: jobs[0]!.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.job.update({
      where: { id: jobs[1]!.id },
      data: { status: "FAILED", failedAt: new Date(), lastError: "boom" },
    });

    await prisma.worker.create({
      data: { hostname: "alive", pid: 1, queueNames: [], concurrency: 5, status: WorkerStatus.ALIVE },
    });
    await prisma.worker.create({
      data: { hostname: "dead", pid: 2, queueNames: [], concurrency: 5, status: WorkerStatus.DEAD },
    });

    const res = await request(app).get("/api/overview").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activeWorkers).toBe(1);
    expect(res.body.deadWorkers).toBe(1);
    expect(res.body.queueBacklog).toBe(1); // the 3rd job, still QUEUED
    expect(res.body.completedLastHour).toBe(1);
    expect(res.body.failedLastHour).toBe(1);
    expect(res.body.failureRatePercent).toBe(50);
    expect(res.body.statusCounts.COMPLETED).toBe(1);
    expect(res.body.statusCounts.FAILED).toBe(1);
    expect(res.body.statusCounts.QUEUED).toBe(1);
    expect(Array.isArray(res.body.throughputSeries)).toBe(true);
    expect(res.body.throughputSeries.length).toBeGreaterThan(0);
    const lastBucket = res.body.throughputSeries[res.body.throughputSeries.length - 1];
    expect(lastBucket.completed + lastBucket.failed).toBeGreaterThanOrEqual(1);
  });

  it("does not include another org's jobs in the aggregate counts", async () => {
    const { token: tokenA } = await registerTestUser(app);
    const { token: tokenB } = await registerTestUser(app);

    const projectB = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "ProjB" });
    const queueB = await request(app)
      .post(`/api/projects/${projectB.body.id}/queues`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "default" });
    await request(app)
      .post(`/api/queues/${queueB.body.id}/jobs`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ jobType: "email" });

    const res = await request(app).get("/api/overview").set("Authorization", `Bearer ${tokenA}`);
    expect(res.body.queueBacklog).toBe(0);
  });
});
