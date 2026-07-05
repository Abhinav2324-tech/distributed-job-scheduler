import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("auth", () => {
  it("registers a new org + admin user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      orgName: "Acme Inc",
      name: "Ada Lovelace",
      email: "ada@acme.test",
      password: "supersecret123",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe("ada@acme.test");
    expect(res.body.user.role).toBe("ADMIN");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email registration", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ orgName: "Org A", name: "A", email: "dup@acme.test", password: "supersecret123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ orgName: "Org B", name: "B", email: "dup@acme.test", password: "supersecret123" });

    expect(res.status).toBe(409);
  });

  it("rejects registration with an invalid payload", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ orgName: "A", name: "A", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in with correct credentials and rejects a wrong password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ orgName: "Acme", name: "Ada", email: "login@acme.test", password: "correct-password" });

    const good = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@acme.test", password: "correct-password" });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeTypeOf("string");

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@acme.test", password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("rejects requests to protected routes without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ orgName: "Acme", name: "Ada", email: "me@acme.test", password: "supersecret123" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${register.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@acme.test");
  });
});
