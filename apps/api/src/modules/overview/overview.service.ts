import { prisma, WorkerStatus } from "@jobscheduler/db";

const THROUGHPUT_WINDOW_HOURS = 12;

interface ThroughputRow {
  bucket: Date;
  completed: bigint;
  failed: bigint;
}

/**
 * One dedicated aggregate endpoint rather than the frontend stitching
 * together several list calls - a handful of grouped/raw queries here is
 * cheaper than N+1 round trips from the client, and keeps "what counts as
 * the org's throughput" defined in one place.
 */
export async function getOverview(orgId: string) {
  const [statusGrouped, activeWorkers, deadWorkers, windowStart] = await Promise.all([
    prisma.job.groupBy({
      by: ["status"],
      where: { queue: { project: { orgId } } },
      _count: true,
    }),
    prisma.worker.count({ where: { status: WorkerStatus.ALIVE } }),
    prisma.worker.count({ where: { status: WorkerStatus.DEAD } }),
    Promise.resolve(new Date(Date.now() - THROUGHPUT_WINDOW_HOURS * 60 * 60 * 1000)),
  ]);

  const counts = Object.fromEntries(statusGrouped.map((g) => [g.status, g._count]));
  const queueBacklog = (counts.QUEUED ?? 0) + (counts.SCHEDULED ?? 0);
  const runningCount = (counts.CLAIMED ?? 0) + (counts.RUNNING ?? 0);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [completedLastHour, failedLastHour] = await Promise.all([
    prisma.job.count({
      where: { queue: { project: { orgId } }, status: "COMPLETED", completedAt: { gte: oneHourAgo } },
    }),
    prisma.job.count({
      where: {
        queue: { project: { orgId } },
        status: { in: ["FAILED", "DEAD_LETTER"] },
        failedAt: { gte: oneHourAgo },
      },
    }),
  ]);
  const totalLastHour = completedLastHour + failedLastHour;
  const failureRatePercent = totalLastHour === 0 ? 0 : Math.round((failedLastHour / totalLastHour) * 100);

  const throughputRows = await prisma.$queryRaw<ThroughputRow[]>`
    SELECT date_trunc('hour', COALESCE(j.completed_at, j.failed_at)) AS bucket,
           COUNT(*) FILTER (WHERE j.status = 'COMPLETED') AS completed,
           COUNT(*) FILTER (WHERE j.status IN ('FAILED', 'DEAD_LETTER')) AS failed
    FROM jobs j
    JOIN queues q ON q.id = j.queue_id
    JOIN projects p ON p.id = q.project_id
    WHERE p.org_id::text = ${orgId}
      AND (j.completed_at >= ${windowStart} OR j.failed_at >= ${windowStart})
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const throughputSeries = buildHourlySeries(windowStart, throughputRows);

  return {
    activeWorkers,
    deadWorkers,
    queueBacklog,
    runningCount,
    completedLastHour,
    failedLastHour,
    failureRatePercent,
    statusCounts: {
      QUEUED: counts.QUEUED ?? 0,
      SCHEDULED: counts.SCHEDULED ?? 0,
      CLAIMED: counts.CLAIMED ?? 0,
      RUNNING: counts.RUNNING ?? 0,
      COMPLETED: counts.COMPLETED ?? 0,
      FAILED: counts.FAILED ?? 0,
      DEAD_LETTER: counts.DEAD_LETTER ?? 0,
    },
    throughputSeries,
  };
}

/**
 * Fills in zero-activity hours so the chart shows a continuous timeline.
 * Postgres's date_trunc('hour', ...) buckets in the session's timezone
 * (UTC, by default in an unconfigured Postgres container) - this must use
 * the UTC Date methods to generate the same bucket boundaries, not the
 * local-timezone setHours/setMinutes, or the two hour-grids drift apart
 * whenever the host isn't itself running in UTC.
 */
function buildHourlySeries(windowStart: Date, rows: ThroughputRow[]) {
  const byBucket = new Map(rows.map((r) => [r.bucket.getTime(), r]));
  const series: Array<{ bucket: string; completed: number; failed: number }> = [];

  const cursor = new Date(windowStart);
  cursor.setUTCMinutes(0, 0, 0);
  const now = new Date();

  while (cursor <= now) {
    const row = byBucket.get(cursor.getTime());
    series.push({
      bucket: cursor.toISOString(),
      completed: row ? Number(row.completed) : 0,
      failed: row ? Number(row.failed) : 0,
    });
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }

  return series;
}
