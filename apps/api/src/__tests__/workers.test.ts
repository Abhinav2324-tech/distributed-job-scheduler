import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma, WorkerStatus } from "@jobscheduler/db";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";

const app = createApp();

describe("workers listing", () => {
  it("lists workers with their active jobs, regardless of org (workers are not org-scoped)", async () => {
    const { token } = await registerTestUser(app);
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

    const worker = await prisma.worker.create({
      data: { hostname: "h1", pid: 1, queueNames: [], concurrency: 5, status: WorkerStatus.ALIVE },
    });
    await prisma.job.update({
      where: { id: created.body.job.id },
      data: { status: "RUNNING", claimedByWorkerId: worker.id, claimedAt: new Date() },
    });

    const res = await request(app).get("/api/workers").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const found = res.body.data.find((w: { id: string }) => w.id === worker.id);
    expect(found).toBeDefined();
    expect(found.activeJobs).toHaveLength(1);
    expect(found.activeJobs[0].id).toBe(created.body.job.id);
  });

  it("filters workers by status", async () => {
    const { token } = await registerTestUser(app);
    await prisma.worker.create({
      data: { hostname: "alive", pid: 1, queueNames: [], concurrency: 5, status: WorkerStatus.ALIVE },
    });
    await prisma.worker.create({
      data: { hostname: "dead", pid: 2, queueNames: [], concurrency: 5, status: WorkerStatus.DEAD },
    });

    const res = await request(app)
      .get("/api/workers?status=DEAD")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((w: { status: string }) => w.status === "DEAD")).toBe(true);
    expect(res.body.data.some((w: { hostname: string }) => w.hostname === "dead")).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/workers");
    expect(res.status).toBe(401);
  });
});
