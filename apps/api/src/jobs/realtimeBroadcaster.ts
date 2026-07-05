import { prisma } from "@jobscheduler/db";
import { WS_EVENTS } from "@jobscheduler/shared";
import { getIO, orgRoom } from "../lib/socket";
import { logger } from "../lib/logger";

// Job status changes happen in the worker process, which has no socket
// connection of its own - rather than adding a cross-process event bus
// (Postgres LISTEN/NOTIFY, a message queue, etc.), this ticker polls for
// what changed since the last tick and rebroadcasts it. At a 2s default
// interval that reads as "live" to a human without new infrastructure.
let lastTick = new Date();

export function startRealtimeBroadcaster(intervalMs: number): NodeJS.Timeout {
  lastTick = new Date();
  return setInterval(() => {
    tick().catch((err) => logger.error({ err }, "Realtime broadcast tick failed"));
  }, intervalMs);
}

export async function tick(): Promise<void> {
  const since = lastTick;
  lastTick = new Date();
  const io = getIO();

  const changedJobs = await prisma.job.findMany({
    where: { updatedAt: { gt: since } },
    select: {
      id: true,
      queueId: true,
      status: true,
      updatedAt: true,
      queue: { select: { project: { select: { orgId: true } } } },
    },
    take: 500,
  });
  if (changedJobs.length === 0) return;

  const orgsWithChanges = new Set<string>();
  for (const job of changedJobs) {
    const orgId = job.queue.project.orgId;
    orgsWithChanges.add(orgId);
    io.to(orgRoom(orgId)).emit(WS_EVENTS.JOB_UPDATED, {
      jobId: job.id,
      queueId: job.queueId,
      status: job.status,
      updatedAt: job.updatedAt.toISOString(),
    });
  }

  const queues = await prisma.queue.findMany({
    where: { project: { orgId: { in: Array.from(orgsWithChanges) } }, archivedAt: null },
    select: { id: true, project: { select: { orgId: true } } },
  });
  if (queues.length === 0) return;
  const queueIds = queues.map((q) => q.id);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [statusGrouped, completedLastHourGrouped] = await Promise.all([
    prisma.job.groupBy({ by: ["queueId", "status"], where: { queueId: { in: queueIds } }, _count: true }),
    prisma.job.groupBy({
      by: ["queueId"],
      where: { queueId: { in: queueIds }, status: "COMPLETED", completedAt: { gte: oneHourAgo } },
      _count: true,
    }),
  ]);

  const statsByQueue = new Map<string, Record<string, number>>();
  for (const row of statusGrouped) {
    const existing = statsByQueue.get(row.queueId) ?? {};
    existing[row.status] = row._count;
    statsByQueue.set(row.queueId, existing);
  }
  const completedLastHourByQueue = new Map(completedLastHourGrouped.map((r) => [r.queueId, r._count]));

  for (const queue of queues) {
    const counts = statsByQueue.get(queue.id) ?? {};
    io.to(orgRoom(queue.project.orgId)).emit(WS_EVENTS.QUEUE_STATS, {
      queueId: queue.id,
      queued: (counts.QUEUED ?? 0) + (counts.SCHEDULED ?? 0),
      running: (counts.CLAIMED ?? 0) + (counts.RUNNING ?? 0),
      failed: (counts.FAILED ?? 0) + (counts.DEAD_LETTER ?? 0),
      completedLastHour: completedLastHourByQueue.get(queue.id) ?? 0,
    });
  }
}
