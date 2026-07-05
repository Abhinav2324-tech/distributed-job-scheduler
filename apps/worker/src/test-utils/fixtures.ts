import { randomUUID } from "node:crypto";
import { prisma, BackoffStrategy } from "@jobscheduler/db";

export async function createOrgProjectQueue() {
  const unique = randomUUID();
  const org = await prisma.organization.create({
    data: { name: "Test Org", slug: `test-org-${unique}` },
  });
  const project = await prisma.project.create({
    data: { orgId: org.id, name: "Test Project", slug: `test-project-${unique}` },
  });
  const queue = await prisma.queue.create({
    data: { projectId: project.id, name: `queue-${unique}`, maxConcurrency: 100 },
  });
  return { org, project, queue };
}

export async function createWorker() {
  return prisma.worker.create({
    data: {
      hostname: "test-host",
      pid: Math.floor(Math.random() * 100000),
      queueNames: [],
      concurrency: 5,
    },
  });
}

export async function createJob(
  queueId: string,
  overrides: {
    jobType?: string;
    payload?: unknown;
    maxRetries?: number;
    backoffStrategy?: BackoffStrategy;
    baseDelaySeconds?: number;
    maxDelaySeconds?: number;
    retryCount?: number;
  } = {},
) {
  return prisma.job.create({
    data: {
      queueId,
      jobType: overrides.jobType ?? "email",
      payload: (overrides.payload ?? {}) as never,
      status: "QUEUED",
      retryCount: overrides.retryCount ?? 0,
      maxRetries: overrides.maxRetries ?? 3,
      backoffStrategy: overrides.backoffStrategy ?? BackoffStrategy.EXPONENTIAL,
      baseDelaySeconds: overrides.baseDelaySeconds ?? 30,
      maxDelaySeconds: overrides.maxDelaySeconds ?? 3600,
    },
  });
}
