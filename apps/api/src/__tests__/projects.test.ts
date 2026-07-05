import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { registerTestUser } from "../test-utils/authHelper";
import { signToken } from "../lib/jwt";

const app = createApp();

describe("projects", () => {
  it("creates, lists, updates, and archives a project - cascading archive to its queues", async () => {
    const { token } = await registerTestUser(app);

    const create = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Payments" });
    expect(create.status).toBe(201);
    expect(create.body.slug).toBe("payments");
    const projectId = create.body.id;

    const queueRes = await request(app)
      .post(`/api/projects/${projectId}/queues`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "emails" });
    expect(queueRes.status).toBe(201);

    const list = await request(app).get("/api/projects").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination.totalItems).toBe(1);

    const update = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Payment processing jobs" });
    expect(update.status).toBe(200);
    expect(update.body.description).toBe("Payment processing jobs");

    const archive = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(archive.status).toBe(200);
    expect(archive.body.archivedAt).not.toBeNull();

    const listAfterArchive = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${token}`);
    expect(listAfterArchive.body.data).toHaveLength(0);

    const queueAfterArchive = await request(app)
      .get(`/api/queues/${queueRes.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(queueAfterArchive.body.archivedAt).not.toBeNull();
  });

  it("isolates projects between organizations", async () => {
    const { token: tokenA } = await registerTestUser(app);
    const { token: tokenB } = await registerTestUser(app);

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Org A Project" });
    expect(created.status).toBe(201);

    const res = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  it("de-duplicates project slugs within an org", async () => {
    const { token } = await registerTestUser(app);

    const first = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Reports" });
    const second = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Reports" });

    expect(first.body.slug).toBe("reports");
    expect(second.body.slug).toBe("reports-1");
  });

  it("requires the ADMIN role to archive a project", async () => {
    const { token, user } = await registerTestUser(app);
    const create = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Locked" });

    // registerTestUser always creates an ADMIN (org founder). To exercise
    // the requireRole("ADMIN") rejection path we sign a MEMBER token for
    // the same user/org directly, rather than going through a not-yet-built
    // "invite teammate" endpoint.
    const memberToken = signToken({ userId: user.id, orgId: user.orgId, role: "MEMBER" });

    const forbidden = await request(app)
      .delete(`/api/projects/${create.body.id}`)
      .set("Authorization", `Bearer ${memberToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .delete(`/api/projects/${create.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(allowed.status).toBe(200);
  });
});
