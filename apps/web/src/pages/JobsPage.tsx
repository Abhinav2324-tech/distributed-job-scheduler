import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "../hooks/useJobs";
import { useQueues } from "../hooks/useQueues";
import { StatusBadge, type JobStatusLike } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { JobFormModal } from "../components/JobFormModal";
import { ghostButtonClassName, inputClassName, primaryButtonClassName, secondaryButtonClassName } from "../components/formStyles";

const STATUS_OPTIONS: JobStatusLike[] = [
  "QUEUED",
  "SCHEDULED",
  "CLAIMED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "DEAD_LETTER",
];

export function JobsPage() {
  const navigate = useNavigate();
  const { data: queuesResult } = useQueues();
  const [status, setStatus] = useState("");
  const [queueId, setQueueId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [showSubmit, setShowSubmit] = useState(false);

  const { data, isLoading, isError } = useJobs({
    status: status || undefined,
    queueId: queueId || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
    page,
    pageSize: 20,
  });

  function updateFilter(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  function clearFilters() {
    setStatus("");
    setQueueId("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const hasFilters = status || queueId || from || to;

  return (
    <div>
      <PageHeader
        title="Job Explorer"
        description="Search and filter every job across your organization's queues."
        actions={
          <button onClick={() => setShowSubmit(true)} className={primaryButtonClassName}>
            Submit job
          </button>
        }
      />

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Status</label>
          <select value={status} onChange={updateFilter(setStatus)} className={inputClassName}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Queue</label>
          <select value={queueId} onChange={updateFilter(setQueueId)} className={inputClassName}>
            <option value="">All queues</option>
            {queuesResult?.data.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">From</label>
          <input type="date" value={from} onChange={updateFilter(setFrom)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">To</label>
          <input type="date" value={to} onChange={updateFilter(setTo)} className={inputClassName} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className={`${ghostButtonClassName} mb-0.5`}>
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-raised)] font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Job type</th>
              <th className="px-4 py-3 font-medium">Queue</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Retries</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  Loading jobs...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-status-dead-letter">
                  Failed to load jobs.
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  No jobs match these filters.
                </td>
              </tr>
            )}
            {data?.data.map((job) => (
              <tr
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="cursor-pointer border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-raised)]"
              >
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{job.jobType}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{job.queue?.name ?? "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status as JobStatusLike} />
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-[var(--text-secondary)]">
                  {job.retryCount}/{job.maxRetries}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                  {new Date(job.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalItems} jobs)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={secondaryButtonClassName}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
              className={secondaryButtonClassName}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showSubmit && <JobFormModal onClose={() => setShowSubmit(false)} />}
    </div>
  );
}
