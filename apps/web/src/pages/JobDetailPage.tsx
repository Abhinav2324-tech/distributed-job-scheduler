import { Link, useParams } from "react-router-dom";
import { useJob } from "../hooks/useJobs";
import { useRetryDeadLetterEntry } from "../hooks/useDeadLetter";
import { useToast } from "../contexts/ToastContext";
import { StatusBadge, type JobStatusLike } from "../components/StatusBadge";
import { ApiRequestError } from "../lib/api";

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, isError } = useJob(id);
  const retryDeadLetter = useRetryDeadLetterEntry();
  const { showToast } = useToast();

  if (isLoading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading job...</div>;
  }
  if (isError || !job) {
    return <div className="text-sm text-status-dead-letter">Failed to load job.</div>;
  }

  async function handleRetry() {
    if (!job?.deadLetterEntry) return;
    try {
      await retryDeadLetter.mutateAsync(job.deadLetterEntry.id);
      showToast("Job resubmitted to its queue", "success");
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : "Failed to resubmit job", "error");
    }
  }

  return (
    <div>
      <Link to="/jobs" className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Back to Job Explorer
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{job.jobType}</h1>
          <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{job.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status as JobStatusLike} />
          {job.deadLetterEntry && !job.deadLetterEntry.resolvedAt && (
            <button
              onClick={handleRetry}
              disabled={retryDeadLetter.isPending}
              className="rounded-md bg-status-running px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {retryDeadLetter.isPending ? "Resubmitting..." : "Retry job"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DetailField label="Retry count" value={`${job.retryCount} / ${job.maxRetries}`} />
        <DetailField label="Backoff strategy" value={job.backoffStrategy} />
        <DetailField
          label="Next retry"
          value={job.nextRetryAt ? new Date(job.nextRetryAt).toLocaleString() : "-"}
        />
        <DetailField label="Created" value={new Date(job.createdAt).toLocaleString()} />
      </div>

      {job.lastError && (
        <div className="mt-4 rounded-lg border border-status-dead-letter/30 bg-status-dead-letter/10 px-4 py-3 text-sm text-status-dead-letter">
          {job.lastError}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">Payload</h2>
        <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--surface)] p-3 text-xs text-[var(--text-secondary)]">
          {JSON.stringify(job.payload, null, 2)}
        </pre>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">Execution history</h2>
        {job.executions.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-secondary)]">
            No attempts yet - this job hasn't been claimed.
          </div>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {job.executions.map((execution) => (
              <li
                key={execution.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Attempt {execution.attemptNumber}
                  </div>
                  <StatusBadge status={execution.status as JobStatusLike} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)]">
                  <span>Started {new Date(execution.startedAt).toLocaleString()}</span>
                  <span>Duration {formatDuration(execution.durationMs)}</span>
                </div>
                {execution.errorMessage && (
                  <div className="mt-2 text-xs text-status-dead-letter">{execution.errorMessage}</div>
                )}
                {execution.logs && execution.logs.length > 0 && (
                  <div className="mt-3 rounded-md bg-[var(--surface)] p-2 font-mono text-xs text-[var(--text-secondary)]">
                    {execution.logs.map((log) => (
                      <div key={log.id}>
                        <span className="text-[var(--text-secondary)]/70">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>{" "}
                        {log.message}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
