import { prisma } from "@jobscheduler/db";
import type { ListWorkersQuery } from "./workers.schemas";

/**
 * Workers are not org-scoped in the schema (a worker fleet is shared
 * operational infrastructure, not tenant data), so this list is global to
 * any authenticated user - there is no per-org filtering here, unlike every
 * other resource in this API.
 */
export async function listWorkers(filters: ListWorkersQuery) {
  const workers = await prisma.worker.findMany({
    where: filters.status ? { status: filters.status } : undefined,
    orderBy: { lastHeartbeatAt: "desc" },
    include: {
      jobs: {
        where: { status: { in: ["CLAIMED", "RUNNING"] } },
        select: { id: true, jobType: true, queueId: true, status: true, startedAt: true },
        take: 10,
      },
    },
  });

  return workers.map((worker) => ({
    ...worker,
    activeJobs: worker.jobs,
    jobs: undefined,
  }));
}
