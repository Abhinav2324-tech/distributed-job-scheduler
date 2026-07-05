import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server as HttpServer } from "http";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import { WS_EVENTS } from "@jobscheduler/shared";
import { createApp } from "../app";
import { initSocketServer } from "../lib/socket";
import { tick } from "../jobs/realtimeBroadcaster";
import { registerTestUser } from "../test-utils/authHelper";

describe("realtime broadcaster (Socket.IO)", () => {
  const app = createApp();
  let httpServer: HttpServer;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = createServer(app);
    initSocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  async function connectClient(token: string): Promise<ClientSocket> {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", (err) => reject(err));
    });
    return socket;
  }

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

  it("rejects a connection with no auth token", async () => {
    const socket = ioClient(baseUrl, { auth: {}, transports: ["websocket"], forceNew: true });
    await expect(
      new Promise<void>((resolve, reject) => {
        socket.on("connect", () => reject(new Error("should not have connected")));
        socket.on("connect_error", () => resolve());
      }),
    ).resolves.toBeUndefined();
    socket.close();
  });

  it("delivers job:updated and queue:stats to the connecting org's room after a job changes", async () => {
    const { token } = await registerTestUser(app);
    const queue = await setupQueue(token);
    const client = await connectClient(token);

    const jobUpdatedPromise = new Promise<{ jobId: string; status: string }>((resolve) => {
      client.once(WS_EVENTS.JOB_UPDATED, resolve);
    });
    const queueStatsPromise = new Promise<{ queueId: string; queued: number }>((resolve) => {
      client.once(WS_EVENTS.QUEUE_STATS, resolve);
    });

    const created = await request(app)
      .post(`/api/queues/${queue.id}/jobs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ jobType: "email" });
    await tick();

    const jobEvent = await jobUpdatedPromise;
    expect(jobEvent.jobId).toBe(created.body.job.id);
    expect(jobEvent.status).toBe("QUEUED");

    const statsEvent = await queueStatsPromise;
    expect(statsEvent.queueId).toBe(queue.id);
    expect(statsEvent.queued).toBeGreaterThanOrEqual(1);

    client.close();
  });

  it("does not deliver another org's job updates", async () => {
    const { token: tokenA } = await registerTestUser(app);
    const { token: tokenB } = await registerTestUser(app);
    const queueA = await setupQueue(tokenA);
    const clientB = await connectClient(tokenB);

    let receivedForB = false;
    clientB.once(WS_EVENTS.JOB_UPDATED, () => {
      receivedForB = true;
    });

    await request(app)
      .post(`/api/queues/${queueA.id}/jobs`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ jobType: "email" });
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(receivedForB).toBe(false);
    clientB.close();
  });
});
