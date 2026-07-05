import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "@jobscheduler/db";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";
import { tick } from "../jobs/cronTicker";

const app = createApp();

async function setupQueue(token: string) {
  const project = await request(app)
    .post("/api/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Proj" });
  const queue = await request(app)
    .post(`/api/projects/${project.body.id}/queues`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "default" });
  return queue.body;
}

describe("scheduled jobs (cron)", () => {
  it("creates a scheduled job and computes its next run time from the cron expression", async () => {
    const { token } = await registerTestUser(app);
    const queue = await setupQueue(token);

    const res = await request(app)
      .post(`/api/queues/${queue.id}/scheduled-jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "nightly-report", cronExpression: "0 0 * * *", jobType: "report-generation" });

    expect(res.status).toBe(201);
    expect(new Date(res.body.nextRunAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.body.isActive).toBe(true);
  });

  it("rejects an invalid cron expression", async () => {
    const { token } = await registerTestUser(app);
    const queue = await setupQueue(token);

    const res = await request(app)
      .post(`/api/queues/${queue.id}/scheduled-jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "broken", cronExpression: "not a cron expression", jobType: "email" });

    expect(res.status).toBe(400);
  });

  it("recomputes nextRunAt when cronExpression is updated, and supports pausing via isActive", async () => {
    const { token } = await registerTestUser(app);
    const queue = await setupQueue(token);
    const created = await request(app)
      .post(`/api/queues/${queue.id}/scheduled-jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "job", cronExpression: "0 0 * * *", jobType: "email" });

    const updated = await request(app)
      .patch(`/api/scheduled-jobs/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cronExpression: "0 0 1 * *", isActive: false });

    expect(updated.status).toBe(200);
    expect(updated.body.isActive).toBe(false);
    expect(new Date(updated.body.nextRunAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("deletes a scheduled job without deleting jobs it already spawned", async () => {
    const { token } = await registerTestUser(app);
    const queue = await setupQueue(token);
    const created = await request(app)
      .post(`/api/queues/${queue.id}/scheduled-jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "job", cronExpression: "0 0 * * *", jobType: "email" });

    // Force it due, then materialize a job via the ticker before deleting.
    await prisma.scheduledJob.update({
      where: { id: created.body.id },
      data: { nextRunAt: new Date(Date.now() - 1000) },
    });
    await tick();
    const spawnedJobs = await prisma.job.findMany({ where: { scheduledJobId: created.body.id } });
    expect(spawnedJobs).toHaveLength(1);

    const del = await request(app)
      .delete(`/api/scheduled-jobs/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const jobStillExists = await prisma.job.findUnique({ where: { id: spawnedJobs[0]!.id } });
    expect(jobStillExists).not.toBeNull();
    expect(jobStillExists!.scheduledJobId).toBeNull();
  });

  it("the cron ticker materializes a QUEUED job from a due scheduled job and advances nextRunAt", async () => {
    const { token } = await registerTestUser(app);
    const queue = await setupQueue(token);
    const created = await request(app)
      .post(`/api/queues/${queue.id}/scheduled-jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "every-minute",
        cronExpression: "* * * * *",
        jobType: "data-sync",
        payloadTemplate: { source: "crm" },
      });

    await prisma.scheduledJob.update({
      where: { id: created.body.id },
      data: { nextRunAt: new Date(Date.now() - 1000) },
    });

    const beforeTick = Date.now();
    await tick();

    const jobs = await prisma.job.findMany({ where: { scheduledJobId: created.body.id } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.status).toBe("QUEUED");
    expect(jobs[0]!.jobType).toBe("data-sync");
    expect(jobs[0]!.payload).toEqual({ source: "crm" });

    const refreshed = await prisma.scheduledJob.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(refreshed.lastRunAt).not.toBeNull();
    expect(refreshed.lastRunAt!.getTime()).toBeGreaterThanOrEqual(beforeTick);
    // computeNextRunAt always advances from "now", not from the stale
    // nextRunAt - so the only guaranteed invariant is "still in the future",
    // not "different from whatever it was before" (both computations can
    // legitimately land on the same upcoming cron boundary in a fast test).
    expect(refreshed.nextRunAt.getTime()).toBeGreaterThan(Date.now());

    // Ticking again immediately should be a no-op since nextRunAt is now in the future.
    await tick();
    const jobsAfterSecondTick = await prisma.job.findMany({
      where: { scheduledJobId: created.body.id },
    });
    expect(jobsAfterSecondTick).toHaveLength(1);
  });
});
