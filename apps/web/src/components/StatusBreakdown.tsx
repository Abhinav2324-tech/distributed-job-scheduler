import type { JobStatus } from "@jobscheduler/shared";

const STATUS_ORDER: JobStatus[] = [
  "QUEUED",
  "SCHEDULED",
  "CLAIMED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "DEAD_LETTER",
];

const STATUS_LABELS: Record<JobStatus, string> = {
  QUEUED: "Queued",
  SCHEDULED: "Scheduled",
  CLAIMED: "Claimed",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DEAD_LETTER: "Dead letter",
};

const STATUS_COLOR_VAR: Record<JobStatus, string> = {
  QUEUED: "var(--color-status-queued)",
  SCHEDULED: "var(--color-status-scheduled)",
  CLAIMED: "var(--color-status-running)",
  RUNNING: "var(--color-status-running)",
  COMPLETED: "var(--color-status-completed)",
  FAILED: "var(--color-status-failed)",
  DEAD_LETTER: "var(--color-status-dead-letter)",
};

/** Small "at a glance" meter row per status - never color-alone: each row carries a text label and a count. */
export function StatusBreakdown({ counts }: { counts: Record<JobStatus, number> }) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  return (
    <div className="flex flex-col gap-2">
      {STATUS_ORDER.map((status) => {
        const count = counts[status] ?? 0;
        const pct = total === 0 ? 0 : (count / total) * 100;
        return (
          <div key={status} className="flex items-center gap-3 text-xs">
            <div className="w-24 shrink-0 text-[var(--text-secondary)]">{STATUS_LABELS[status]}</div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${pct}%`, background: STATUS_COLOR_VAR[status] }}
              />
            </div>
            <div className="w-10 shrink-0 text-right font-medium tabular-nums text-[var(--text-primary)]">
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
