import request from "supertest";
import type { Express } from "express";

export async function registerTestUser(
  app: Express,
  overrides: Partial<{ orgName: string; name: string; email: string; password: string }> = {},
) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      orgName: overrides.orgName ?? `Test Org ${uniqueId}`,
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${uniqueId}@test.dev`,
      password: overrides.password ?? "supersecret123",
    });

  if (res.status !== 201) {
    throw new Error(`registerTestUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token as string, user: res.body.user };
}
