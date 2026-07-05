import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";

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
  return { project: project.body, queue: queue.body };
}

describe("job creation", () => {
  it("creates an immediate job as QUEUED with retry fields from the system default policy", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);

    const res = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", payload: { to: "a@b.com" } });

    expect(res.status).toBe(201);
    expect(res.body.deduped).toBe(false);
    expect(res.body.job.status).toBe("QUEUED");
    expect(res.body.job.maxRetries).toBe(3);
    expect(res.body.job.backoffStrategy).toBe("EXPONENTIAL");
  });

  it("creates a delayed job (future runAt) as SCHEDULED, and a past runAt as QUEUED", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const delayed = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", runAt: future });
    expect(delayed.body.job.status).toBe("SCHEDULED");
    expect(new Date(delayed.body.job.runAt).toISOString()).toBe(future);

    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const immediate = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", runAt: past });
    expect(immediate.body.job.status).toBe("QUEUED");
  });

  it("rejects job creation in an archived queue", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);
    await request(app).delete(`/api/queues/${queue.id}`).set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email" });
    expect(res.status).toBe(400);
  });

  it("deduplicates jobs submitted with the same idempotency key in the same queue", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);

    const first = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", idempotencyKey: "welcome-email-user-1" });
    expect(first.status).toBe(201);
    expect(first.body.deduped).toBe(false);

    const second = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", idempotencyKey: "welcome-email-user-1", payload: { different: true } });
    expect(second.status).toBe(200);
    expect(second.body.deduped).toBe(true);
    expect(second.body.job.id).toBe(first.body.job.id);

    const list = await request(app)
      .get(`/api/jobs?queueId=${queue.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data).toHaveLength(1);
  });

  it("allows the same idempotency key across different queues", async () => {
    const { token } = await registerTestUser(app);
    const { project, queue } = await setupQueue(token);
    const queue2 = await request(app)
      .post(`/api/projects/${project.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "second" });

    const a = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", idempotencyKey: "shared-key" });
    const b = await request(app)
      .post(`/api/queues/${queue2.body.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", idempotencyKey: "shared-key" });

    expect(a.body.job.id).not.toBe(b.body.job.id);
  });

  it("creates a batch of jobs in one call, deduplicating any that reuse an idempotency key", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);

    await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", idempotencyKey: "already-exists" });

    const batch = await request(app)
      .post(`/api/queues/${queue.id}/jobs/batch`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        jobs: [
          { jobType: "email", idempotencyKey: "already-exists" },
          { jobType: "report-generation" },
          { jobType: "data-sync" },
        ],
      });

    expect(batch.status).toBe(201);
    expect(batch.body.results).toHaveLength(3);
    expect(batch.body.results[0].deduped).toBe(true);
    expect(batch.body.results[1].deduped).toBe(false);
    expect(batch.body.results[2].deduped).toBe(false);

    const list = await request(app)
      .get(`/api/jobs?queueId=${queue.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data).toHaveLength(3);
  });
});

describe("job listing and filtering", () => {
  it("filters by status, queue, and date range with pagination", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post(`/api/queues/${queue.id}/jobs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ jobType: "email" });
    }
    await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email", runAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() });

    const queuedOnly = await request(app)
      .get(`/api/jobs?status=QUEUED&queueId=${queue.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(queuedOnly.body.data).toHaveLength(3);

    const scheduledOnly = await request(app)
      .get(`/api/jobs?status=SCHEDULED&queueId=${queue.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(scheduledOnly.body.data).toHaveLength(1);

    const paged = await request(app)
      .get(`/api/jobs?queueId=${queue.id}&page=1&pageSize=2`)
      .set("Authorization", `Bearer ${token}`);
    expect(paged.body.data).toHaveLength(2);
    expect(paged.body.pagination.totalItems).toBe(4);
    expect(paged.body.pagination.totalPages).toBe(2);

    const future = await request(app)
      .get(`/api/jobs?queueId=${queue.id}&from=${new Date(Date.now() + 1000).toISOString()}`)
      .set("Authorization", `Bearer ${token}`);
    expect(future.body.data).toHaveLength(0);
  });

  it("returns a single job with its (empty, pre-execution) execution history", async () => {
    const { token } = await registerTestUser(app);
    const { queue } = await setupQueue(token);
    const created = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email" });

    const res = await request(app)
      .get(`/api/jobs/${created.body.job.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.executions).toEqual([]);
    expect(res.body.deadLetterEntry).toBeNull();
  });

  it("isolates job visibility between organizations", async () => {
    const { token: tokenA } = await registerTestUser(app);
    const { queue } = await setupQueue(tokenA);
    const created = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ jobType: "email" });

    const { token: tokenB } = await registerTestUser(app);
    const res = await request(app)
      .get(`/api/jobs/${created.body.job.id}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});
