import { prisma } from "@jobscheduler/db";
import { env } from "../config/env";

/**
 * WORKER_QUEUES holds queue *names* (documented in .env.example), not ids -
 * claimJobs() needs ids. Queue names are only unique per-project, so if two
 * projects happen to have same-named queues, a worker configured by name
 * will poll both; this is a known simplification (see design-decisions.md)
 * acceptable at this project's scale. Re-resolved every poll tick rather
 * than cached, so newly created/archived queues are picked up without a
 * worker restart - cheap enough at this scale to not bother caching.
 */
export async function resolveQueueIds(): Promise<string[]> {
  if (env.WORKER_QUEUES.length === 0) {
    const queues = await prisma.queue.findMany({
      where: { archivedAt: null },
      select: { id: true },
    });
    return queues.map((q) => q.id);
  }

  const queues = await prisma.queue.findMany({
    where: { name: { in: env.WORKER_QUEUES }, archivedAt: null },
    select: { id: true },
  });
  return queues.map((q) => q.id);
}
