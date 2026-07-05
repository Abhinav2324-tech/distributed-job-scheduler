import { useOverview } from "../hooks/useOverview";
import { StatCard } from "../components/StatCard";
import { ThroughputChart } from "../components/ThroughputChart";
import { StatusBreakdown } from "../components/StatusBreakdown";

export function OverviewPage() {
  const { data, isLoading, isError } = useOverview();

  if (isLoading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading overview...</div>;
  }
  if (isError || !data) {
    return <div className="text-sm text-status-dead-letter">Failed to load overview.</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Overview</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        System health at a glance, updated live.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active workers"
          value={data.activeWorkers}
          sublabel={data.deadWorkers > 0 ? `${data.deadWorkers} dead` : "All healthy"}
        />
        <StatCard label="Queue backlog" value={data.queueBacklog} sublabel="Queued + scheduled" />
        <StatCard
          label="Failed job rate"
          value={`${data.failureRatePercent}%`}
          sublabel="Last hour"
          accentClassName={data.failureRatePercent > 20 ? "text-status-dead-letter" : undefined}
        />
        <StatCard
          label="Throughput"
          value={data.completedLastHour}
          sublabel={`${data.failedLastHour} failed, last hour`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 lg:col-span-2">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Throughput (last 12 hours)</h2>
          <div className="mt-2">
            <ThroughputChart data={data.throughputSeries} />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Job status breakdown</h2>
          <div className="mt-4">
            <StatusBreakdown counts={data.statusCounts} />
          </div>
        </div>
      </div>
    </div>
  );
}
