import { prisma, type Prisma } from "@jobscheduler/db";
import { badRequest, conflict, notFound } from "../../lib/errors";
import type { CreateQueueInput, UpdateQueueInput } from "./queues.schemas";

async function assertProjectInOrg(orgId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, orgId } });
  if (!project) throw notFound("Project not found");
  return project;
}

async function assertRetryPolicyInProject(projectId: string, retryPolicyId: string) {
  const policy = await prisma.retryPolicy.findFirst({ where: { id: retryPolicyId, projectId } });
  if (!policy) throw badRequest("retryPolicyId does not belong to this project");
  return policy;
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export async function createQueue(orgId: string, projectId: string, input: CreateQueueInput) {
  await assertProjectInOrg(orgId, projectId);
  if (input.retryPolicyId) {
    await assertRetryPolicyInProject(projectId, input.retryPolicyId);
  }
  try {
    return await prisma.queue.create({
      data: {
        projectId,
        name: input.name,
        priority: input.priority,
        maxConcurrency: input.maxConcurrency,
        retryPolicyId: input.retryPolicyId,
      },
    });
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      throw conflict(`A queue named "${input.name}" already exists in this project`);
    }
    throw err;
  }
}

export async function listQueues(orgId: string, projectId: string, includeArchived: boolean) {
  await assertProjectInOrg(orgId, projectId);
  return prisma.queue.findMany({
    where: { projectId, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Flat, org-wide queue listing (as opposed to listQueues, which is scoped
 * to one project) - powers the dashboard's Queues page. Batches the job
 * status counts into a single groupBy rather than querying stats per
 * queue, to avoid an N+1 query per row.
 */
export async function listAllQueues(
  orgId: string,
  opts: { projectId?: string; includeArchived: boolean },
) {
  const where: Prisma.QueueWhereInput = {
    project: { orgId, ...(opts.projectId ? { id: opts.projectId } : {}) },
    ...(opts.includeArchived ? {} : { archivedAt: null }),
  };

  const queues = await prisma.queue.findMany({
    where,
    include: { project: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (queues.length === 0) return [];

  const grouped = await prisma.job.groupBy({
    by: ["queueId", "status"],
    where: { queueId: { in: queues.map((q) => q.id) } },
    _count: true,
  });
  const statsByQueue = new Map<string, Record<string, number>>();
  for (const row of grouped) {
    const existing = statsByQueue.get(row.queueId) ?? {};
    existing[row.status] = row._count;
    statsByQueue.set(row.queueId, existing);
  }

  return queues.map((queue) => {
    const counts = statsByQueue.get(queue.id) ?? {};
    return {
      ...queue,
      stats: {
        queued: (counts.QUEUED ?? 0) + (counts.SCHEDULED ?? 0),
        running: (counts.CLAIMED ?? 0) + (counts.RUNNING ?? 0),
        completed: counts.COMPLETED ?? 0,
        failed: counts.FAILED ?? 0,
        deadLetter: counts.DEAD_LETTER ?? 0,
      },
    };
  });
}

export async function getQueueOrThrow(orgId: string, id: string) {
  const queue = await prisma.queue.findFirst({ where: { id, project: { orgId } } });
  if (!queue) throw notFound("Queue not found");
  return queue;
}

export async function updateQueue(orgId: string, id: string, input: UpdateQueueInput) {
  const queue = await getQueueOrThrow(orgId, id);
  if (input.retryPolicyId) {
    await assertRetryPolicyInProject(queue.projectId, input.retryPolicyId);
  }
  return prisma.queue.update({ where: { id }, data: input });
}

export async function setPaused(orgId: string, id: string, isPaused: boolean) {
  await getQueueOrThrow(orgId, id);
  return prisma.queue.update({ where: { id }, data: { isPaused } });
}

export async function archiveQueue(orgId: string, id: string) {
  await getQueueOrThrow(orgId, id);
  return prisma.queue.update({ where: { id }, data: { archivedAt: new Date() } });
}

export async function getQueueStats(orgId: string, id: string) {
  await getQueueOrThrow(orgId, id);
  const grouped = await prisma.job.groupBy({
    by: ["status"],
    where: { queueId: id },
    _count: true,
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const completedLastHour = await prisma.job.count({
    where: { queueId: id, status: "COMPLETED", completedAt: { gte: oneHourAgo } },
  });

  return {
    queueId: id,
    queued: (counts.QUEUED ?? 0) + (counts.SCHEDULED ?? 0),
    running: (counts.CLAIMED ?? 0) + (counts.RUNNING ?? 0),
    completed: counts.COMPLETED ?? 0,
    failed: counts.FAILED ?? 0,
    deadLetter: counts.DEAD_LETTER ?? 0,
    completedLastHour,
  };
}
