import { clsx } from "clsx";

export type JobStatusLike =
  | "QUEUED"
  | "SCHEDULED"
  | "CLAIMED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "DEAD_LETTER";

const STYLES: Record<JobStatusLike, string> = {
  QUEUED: "bg-status-queued/10 text-status-queued border-status-queued/30",
  SCHEDULED: "bg-status-scheduled/10 text-status-scheduled border-status-scheduled/30",
  CLAIMED: "bg-status-running/10 text-status-running border-status-running/30",
  RUNNING: "bg-status-running/10 text-status-running border-status-running/30",
  COMPLETED: "bg-status-completed/10 text-status-completed border-status-completed/30",
  FAILED: "bg-status-failed/10 text-status-failed border-status-failed/30",
  DEAD_LETTER: "bg-status-dead-letter/10 text-status-dead-letter border-status-dead-letter/30",
};

const LABELS: Record<JobStatusLike, string> = {
  QUEUED: "Queued",
  SCHEDULED: "Scheduled",
  CLAIMED: "Claimed",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DEAD_LETTER: "Dead letter",
};

export function StatusBadge({ status }: { status: JobStatusLike }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
