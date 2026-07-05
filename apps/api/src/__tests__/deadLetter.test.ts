import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "@jobscheduler/db";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";

const app = createApp();

async function setupDeadLetteredJob(token: string) {
  const project = await request(app)
    .post("/api/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Proj" });
  const queue = await request(app)
    .post(`/api/projects/${project.body.id}/queues`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "default" });
  const created = await request(app)
    .post(`/api/queues/${queue.body.id}/jobs`)
    .set("Authorization", `Bearer ${token}`)
    .send({ jobType: "email" });
  const job = created.body.job;

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "DEAD_LETTER", retryCount: 4, lastError: "boom", failedAt: new Date() },
  });
  const entry = await prisma.deadLetterEntry.create({
    data: { jobId: job.id, reason: "Exceeded max retries (3)", finalError: "boom" },
  });

  return { queue: queue.body, job, entry };
}

describe("dead letter queue", () => {
  it("lists unresolved dead letter entries scoped to the org", async () => {
    const { token } = await registerTestUser(app);
    const { job, entry } = await setupDeadLetteredJob(token);

    const res = await request(app).get("/api/dlq").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(entry.id);
    expect(res.body.data[0].job.id).toBe(job.id);
  });

  it("resubmits a dead-lettered job: resets it to QUEUED and marks the entry resolved", async () => {
    const { token } = await registerTestUser(app);
    const { job, entry } = await setupDeadLetteredJob(token);

    const res = await request(app)
      .post(`/api/dlq/${entry.id}/retry`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("QUEUED");
    expect(res.body.retryCount).toBe(0);
    expect(res.body.lastError).toBeNull();

    const refreshedJob = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(refreshedJob.status).toBe("QUEUED");

    const refreshedEntry = await prisma.deadLetterEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(refreshedEntry.resolvedAt).not.toBeNull();

    // Resolved entries drop out of the default (unresolved-only) listing.
    const list = await request(app).get("/api/dlq").set("Authorization", `Bearer ${token}`);
    expect(list.body.data).toHaveLength(0);
  });

  it("rejects retrying an entry that was already resubmitted", async () => {
    const { token } = await registerTestUser(app);
    const { entry } = await setupDeadLetteredJob(token);

    await request(app).post(`/api/dlq/${entry.id}/retry`).set("Authorization", `Bearer ${token}`);
    const second = await request(app)
      .post(`/api/dlq/${entry.id}/retry`)
      .set("Authorization", `Bearer ${token}`);
    expect(second.status).toBe(409);
  });

  it("isolates dead letter entries between organizations", async () => {
    const { token: tokenA } = await registerTestUser(app);
    const { entry } = await setupDeadLetteredJob(tokenA);

    const { token: tokenB } = await registerTestUser(app);
    const res = await request(app)
      .post(`/api/dlq/${entry.id}/retry`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);

    const list = await request(app).get("/api/dlq").set("Authorization", `Bearer ${tokenB}`);
    expect(list.body.data).toHaveLength(0);
  });
});
