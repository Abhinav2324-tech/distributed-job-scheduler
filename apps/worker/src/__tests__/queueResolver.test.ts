import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "@jobscheduler/db";
import { createOrgProjectQueue } from "../test-utils/fixtures";

describe("resolveQueueIds", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("resolves to all non-archived queues when WORKER_QUEUES is empty", async () => {
    const { queue: queueA } = await createOrgProjectQueue();
    const { queue: queueB } = await createOrgProjectQueue();
    const { queue: archived } = await createOrgProjectQueue();
    await prisma.queue.update({ where: { id: archived.id }, data: { archivedAt: new Date() } });

    vi.stubEnv("WORKER_QUEUES", "");
    vi.resetModules();
    const { resolveQueueIds } = await import("../lib/queueResolver");

    const ids = await resolveQueueIds();
    expect(new Set(ids)).toEqual(new Set([queueA.id, queueB.id]));
  });

  it("resolves only queues matching the configured names, excluding archived ones", async () => {
    const { queue: match } = await createOrgProjectQueue();
    const { queue: other } = await createOrgProjectQueue();

    vi.stubEnv("WORKER_QUEUES", match.name);
    vi.resetModules();
    const { resolveQueueIds } = await import("../lib/queueResolver");

    const ids = await resolveQueueIds();
    expect(ids).toEqual([match.id]);
    expect(ids).not.toContain(other.id);
  });
});
