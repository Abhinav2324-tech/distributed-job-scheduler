import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";

const app = createApp();

async function createProject(token: string, name = "Proj") {
  const res = await request(app)
    .post("/api/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name });
  return res.body;
}

describe("queues", () => {
  it("creates a queue with defaults and supports pause/resume and config updates", async () => {
    const { token } = await registerTestUser(app);
    const project = await createProject(token);

    const create = await request(app)
      .post(`/api/projects/${project.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "reports" });
    expect(create.status).toBe(201);
    expect(create.body.priority).toBe(0);
    expect(create.body.maxConcurrency).toBe(5);
    expect(create.body.isPaused).toBe(false);

    const pause = await request(app)
      .post(`/api/queues/${create.body.id}/pause`)
      .set("Authorization", `Bearer ${token}`);
    expect(pause.body.isPaused).toBe(true);

    const resume = await request(app)
      .post(`/api/queues/${create.body.id}/resume`)
      .set("Authorization", `Bearer ${token}`);
    expect(resume.body.isPaused).toBe(false);

    const update = await request(app)
      .patch(`/api/queues/${create.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ priority: 10, maxConcurrency: 20 });
    expect(update.body.priority).toBe(10);
    expect(update.body.maxConcurrency).toBe(20);
  });

  it("rejects duplicate queue names within the same project but allows the same name in a different project", async () => {
    const { token } = await registerTestUser(app);
    const project = await createProject(token);
    const otherProject = await createProject(token, "Other");

    await request(app)
      .post(`/api/projects/${project.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "dup" });

    const duplicate = await request(app)
      .post(`/api/projects/${project.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "dup" });
    expect(duplicate.status).toBe(409);

    const sameNameOtherProject = await request(app)
      .post(`/api/projects/${otherProject.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "dup" });
    expect(sameNameOtherProject.status).toBe(201);
  });

  it("returns queue stats with zero counts before any jobs exist", async () => {
    const { token } = await registerTestUser(app);
    const project = await createProject(token);
    const queue = await request(app)
      .post(`/api/projects/${project.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "stats-test" });

    const stats = await request(app)
      .get(`/api/queues/${queue.body.id}/stats`)
      .set("Authorization", `Bearer ${token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.queued).toBe(0);
    expect(stats.body.running).toBe(0);
    expect(stats.body.completedLastHour).toBe(0);
  });

  it("rejects attaching a retry policy that belongs to a different project", async () => {
    const { token } = await registerTestUser(app);
    const project = await createProject(token);
    const otherProject = await createProject(token, "Other");

    const policy = await request(app)
      .post(`/api/projects/${otherProject.id}/retry-policies`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "aggressive" });
    expect(policy.status).toBe(201);

    const res = await request(app)
      .post(`/api/projects/${project.id}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "cross-project", retryPolicyId: policy.body.id });
    expect(res.status).toBe(400);
  });

  it("lists all of an org's queues flat (across projects) with batched live stats, isolated from other orgs", async () => {
    const { token: tokenA } = await registerTestUser(app);
    const projectA1 = await createProject(tokenA, "A1");
    const projectA2 = await createProject(tokenA, "A2");
    const queueA1 = await request(app)
      .post(`/api/projects/${projectA1.id}/queues`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "q1" });
    await request(app)
      .post(`/api/projects/${projectA2.id}/queues`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "q2" });
    await request(app)
      .post(`/api/queues/${queueA1.body.id}/jobs`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ jobType: "email" });

    const { token: tokenB } = await registerTestUser(app);
    const projectB = await createProject(tokenB, "B");
    await request(app)
      .post(`/api/projects/${projectB.id}/queues`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "b-queue" });

    const listA = await request(app).get("/api/queues").set("Authorization", `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(2);
    const q1 = listA.body.data.find((q: { id: string }) => q.id === queueA1.body.id);
    expect(q1.stats.queued).toBe(1);
    expect(q1.project.name).toBe("A1");

    const listB = await request(app).get("/api/queues").set("Authorization", `Bearer ${tokenB}`);
    expect(listB.body.data).toHaveLength(1);
    expect(listB.body.data[0].name).toBe("b-queue");
  });
});
