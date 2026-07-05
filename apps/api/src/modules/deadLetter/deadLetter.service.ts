import { prisma, type Prisma } from "@jobscheduler/db";
import { conflict, notFound } from "../../lib/errors";
import { buildPaginationResult } from "../../lib/pagination";
import type { ListDeadLetterQuery } from "./deadLetter.schemas";

export async function listDeadLetterEntries(orgId: string, filters: ListDeadLetterQuery) {
  const where: Prisma.DeadLetterEntryWhereInput = {
    ...(filters.includeResolved ? {} : { resolvedAt: null }),
    job: {
      queue: {
        project: { orgId },
        ...(filters.queueId ? { id: filters.queueId } : {}),
      },
    },
  };

  const [data, totalItems] = await Promise.all([
    prisma.deadLetterEntry.findMany({
      where,
      include: { job: true },
      orderBy: { movedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.deadLetterEntry.count({ where }),
  ]);

  return buildPaginationResult(data, totalItems, filters.page, filters.pageSize);
}

/**
 * Resubmits a dead-lettered job: resets it to a clean QUEUED slate (fresh
 * retryCount, cleared claim/error/scheduling fields) and marks the DLQ
 * entry resolved. The entry row itself is kept (not deleted) as a
 * historical record that this job failed permanently once before.
 */
export async function retryDeadLetterEntry(orgId: string, id: string) {
  const entry = await prisma.deadLetterEntry.findFirst({
    where: { id, job: { queue: { project: { orgId } } } },
  });
  if (!entry) throw notFound("Dead letter entry not found");
  if (entry.resolvedAt) throw conflict("This dead letter entry has already been resubmitted");

  const now = new Date();
  const [job] = await prisma.$transaction([
    prisma.job.update({
      where: { id: entry.jobId },
      data: {
        status: "QUEUED",
        retryCount: 0,
        nextRetryAt: null,
        runAt: null,
        claimedByWorkerId: null,
        claimedAt: null,
        startedAt: null,
        completedAt: null,
        failedAt: null,
        lastError: null,
      },
    }),
    prisma.deadLetterEntry.update({ where: { id: entry.id }, data: { resolvedAt: now } }),
  ]);

  return job;
}
