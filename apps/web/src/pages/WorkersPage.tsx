import { clsx } from "clsx";
import { useWorkers } from "../hooks/useWorkers";
import { formatRelativeTime } from "../lib/formatRelativeTime";

const WORKER_STATUS_STYLES: Record<string, string> = {
  ALIVE: "bg-status-completed/10 text-status-completed border-status-completed/30",
  DRAINING: "bg-status-failed/10 text-status-failed border-status-failed/30",
  DEAD: "bg-status-dead-letter/10 text-status-dead-letter border-status-dead-letter/30",
};

function WorkerStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        WORKER_STATUS_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status[0]}
      {status.slice(1).toLowerCase()}
    </span>
  );
}

export function WorkersPage() {
  const { data, isLoading, isError } = useWorkers();

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Workers</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Live worker fleet status, refreshed every few seconds.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Host</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Load</th>
              <th className="px-4 py-3 font-medium">Current jobs</th>
              <th className="px-4 py-3 font-medium">Last heartbeat</th>
              <th className="px-4 py-3 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  Loading workers...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-status-dead-letter">
                  Failed to load workers.
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  No workers have registered yet.
                </td>
              </tr>
            )}
            {data?.data.map((worker) => (
              <tr key={worker.id} className="border-t border-[var(--border-subtle)] align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text-primary)]">{worker.hostname}</div>
                  <div className="text-xs text-[var(--text-secondary)]">pid {worker.pid}</div>
                </td>
                <td className="px-4 py-3">
                  <WorkerStatusBadge status={worker.status} />
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
                  {worker.currentJobCount} / {worker.concurrency}
                </td>
                <td className="px-4 py-3">
                  {worker.activeJobs.length === 0 ? (
                    <span className="text-[var(--text-secondary)]">Idle</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {worker.activeJobs.map((job) => (
                        <span key={job.id} className="text-xs text-[var(--text-secondary)]">
                          {job.jobType}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatRelativeTime(worker.lastHeartbeatAt)}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {new Date(worker.startedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
