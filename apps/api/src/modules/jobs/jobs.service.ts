import { prisma, type Prisma } from "@jobscheduler/db";
import { badRequest, notFound } from "../../lib/errors";
import { buildPaginationResult } from "../../lib/pagination";
import { retryFieldsFromPolicy } from "../../lib/retryDefaults";
import type { CreateJobInput, ListJobsQuery } from "./jobs.schemas";

type Db = Pick<typeof prisma, "job" | "queue">;

async function getWritableQueue(orgId: string, queueId: string) {
  const queue = await prisma.queue.findFirst({
    where: { id: queueId, project: { orgId } },
    include: { retryPolicy: true },
  });
  if (!queue) throw notFound("Queue not found");
  if (queue.archivedAt) throw badRequest("Cannot create jobs in an archived queue");
  return queue;
}

function buildJobCreateData(
  queue: { id: string; retryPolicy: Parameters<typeof retryFieldsFromPolicy>[0] },
  input: CreateJobInput,
): Prisma.JobUncheckedCreateInput {
  const now = new Date();
  const runAt = input.runAt ?? null;
  const isFuture = runAt !== null && runAt.getTime() > now.getTime();

  return {
    queueId: queue.id,
    jobType: input.jobType,
    payload: input.payload as Prisma.InputJsonValue,
    idempotencyKey: input.idempotencyKey,
    status: isFuture ? "SCHEDULED" : "QUEUED",
    runAt,
    ...retryFieldsFromPolicy(queue.retryPolicy),
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Insert-first, handle-conflict: attempts the create directly rather than
 * checking-then-inserting, so two concurrent requests with the same
 * idempotency key can't both pass a pre-check and double-create.
 */
async function createOrDedupe(
  db: Db,
  queueId: string,
  data: Prisma.JobUncheckedCreateInput,
): Promise<{ job: Awaited<ReturnType<Db["job"]["create"]>>; deduped: boolean }> {
  try {
    const job = await db.job.create({ data });
    return { job, deduped: false };
  } catch (err: unknown) {
    if (data.idempotencyKey && isUniqueConstraintError(err)) {
      const existing = await db.job.findFirst({
        where: { queueId, idempotencyKey: data.idempotencyKey },
      });
      if (existing) return { job: existing, deduped: true };
    }
    throw err;
  }
}

export async function createJob(orgId: string, queueId: string, input: CreateJobInput) {
  const queue = await getWritableQueue(orgId, queueId);
  const data = buildJobCreateData(queue, input);
  return createOrDedupe(prisma, queueId, data);
}

/**
 * Each item is processed independently (its own create-or-dedupe call)
 * rather than wrapped in one shared transaction. Postgres aborts an entire
 * transaction after any statement inside it errors, so a shared transaction
 * would mean the dedup lookup that runs *after* catching item N's unique-
 * key violation would itself fail on the now-poisoned transaction. Per-item
 * independence also matches idempotency semantics better: one item in a
 * 500-job batch being a duplicate shouldn't fail the other 499.
 */
export async function createJobsBatch(orgId: string, queueId: string, inputs: CreateJobInput[]) {
  const queue = await getWritableQueue(orgId, queueId);
  const results: Array<{ job: unknown; deduped: boolean }> = [];
  for (const input of inputs) {
    const data = buildJobCreateData(queue, input);
    // eslint-disable-next-line no-await-in-loop
    results.push(await createOrDedupe(prisma, queueId, data));
  }
  return results;
}

export async function listJobs(orgId: string, filters: ListJobsQuery) {
  const where: Prisma.JobWhereInput = {
    queue: {
      project: {
        orgId,
        ...(filters.projectId ? { id: filters.projectId } : {}),
      },
      ...(filters.queueId ? { id: filters.queueId } : {}),
    },
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [data, totalItems] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { queue: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return buildPaginationResult(data, totalItems, filters.page, filters.pageSize);
}

export async function getJobOrThrow(orgId: string, id: string) {
  const job = await prisma.job.findFirst({
    where: { id, queue: { project: { orgId } } },
    include: {
      executions: { include: { logs: true }, orderBy: { attemptNumber: "asc" } },
      deadLetterEntry: true,
    },
  });
  if (!job) throw notFound("Job not found");
  return job;
}
