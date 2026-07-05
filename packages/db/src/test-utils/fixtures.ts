import { randomUUID } from "node:crypto";
import { prisma, JobStatus, BackoffStrategy, type Job } from "../index";

export async function createOrgProjectQueue(
  overrides: {
    priority?: number;
    maxConcurrency?: number;
    isPaused?: boolean;
    archived?: boolean;
  } = {},
) {
  const unique = randomUUID();
  const org = await prisma.organization.create({
    data: { name: "Test Org", slug: `test-org-${unique}` },
  });
  const project = await prisma.project.create({
    data: { orgId: org.id, name: "Test Project", slug: `test-project-${unique}` },
  });
  const queue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: `queue-${unique}`,
      priority: overrides.priority ?? 0,
      maxConcurrency: overrides.maxConcurrency ?? 100,
      isPaused: overrides.isPaused ?? false,
      archivedAt: overrides.archived ? new Date() : null,
    },
  });
  return { org, project, queue };
}

export async function createJobs(
  queueId: string,
  count: number,
  overrides: Partial<{ status: JobStatus; runAt: Date | null }> = {},
): Promise<Job[]> {
  const status = overrides.status ?? JobStatus.QUEUED;
  await prisma.job.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      queueId,
      jobType: "test-job",
      payload: { i },
      status,
      runAt: overrides.runAt ?? null,
      maxRetries: 3,
      backoffStrategy: BackoffStrategy.EXPONENTIAL,
      baseDelaySeconds: 30,
      maxDelaySeconds: 3600,
    })),
  });
  return prisma.job.findMany({ where: { queueId, status }, orderBy: { createdAt: "asc" } });
}

/**
 * claimedByWorkerId is a real FK to the workers table (Prisma enforces it),
 * so tests that exercise claiming must claim as an actual Worker row, not
 * an arbitrary string.
 */
export async function createWorker(overrides: { concurrency?: number } = {}) {
  return prisma.worker.create({
    data: {
      hostname: "test-host",
      pid: Math.floor(Math.random() * 100000),
      queueNames: [],
      concurrency: overrides.concurrency ?? 5,
    },
  });
}

export async function createWorkers(count: number) {
  return Promise.all(Array.from({ length: count }, () => createWorker()));
}
