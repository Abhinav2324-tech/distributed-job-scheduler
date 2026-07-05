import { useOverview } from "../hooks/useOverview";
import { StatCard } from "../components/StatCard";
import { ThroughputChart } from "../components/ThroughputChart";
import { StatusBreakdown } from "../components/StatusBreakdown";
import { PageHeader } from "../components/PageHeader";

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
      <PageHeader title="Overview" description="System health at a glance, updated live." />

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

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            Throughput <span className="font-sans font-normal text-[var(--text-secondary)]">— last 12 hours</span>
          </h2>
          <div className="mt-3">
            <ThroughputChart data={data.throughputSeries} />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">Job status breakdown</h2>
          <div className="mt-4">
            <StatusBreakdown counts={data.statusCounts} />
          </div>
        </div>
      </div>
    </div>
  );
}
