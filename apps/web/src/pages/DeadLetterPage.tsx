import { useState } from "react";
import { Link } from "react-router-dom";
import { useDeadLetterEntries, useRetryDeadLetterEntry } from "../hooks/useDeadLetter";
import { useToast } from "../contexts/ToastContext";
import { ApiRequestError } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { primaryButtonClassName, secondaryButtonClassName } from "../components/formStyles";

export function DeadLetterPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useDeadLetterEntries(page);
  const retryEntry = useRetryDeadLetterEntry();
  const { showToast } = useToast();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function handleRetry(id: string, jobType: string) {
    setRetryingId(id);
    try {
      await retryEntry.mutateAsync(id);
      showToast(`"${jobType}" resubmitted to its queue`, "success");
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : "Failed to resubmit job", "error");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Dead Letter Queue"
        description="Jobs that exceeded their retry budget. Resubmitting resets them to a fresh queued state."
      />

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-raised)] font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Job type</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Final error</th>
              <th className="px-4 py-3 font-medium">Moved at</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  Loading dead letter queue...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-status-dead-letter">
                  Failed to load the dead letter queue.
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  Nothing here - no jobs have exhausted their retries.
                </td>
              </tr>
            )}
            {data?.data.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-raised)]/60"
              >
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  <Link to={`/jobs/${entry.jobId}`} className="hover:text-[var(--brand)] hover:underline">
                    {entry.job?.jobType ?? entry.jobId}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{entry.reason}</td>
                <td
                  className="max-w-xs truncate px-4 py-3 font-mono text-xs text-status-dead-letter"
                  title={entry.finalError ?? ""}
                >
                  {entry.finalError ?? "-"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                  {new Date(entry.movedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRetry(entry.id, entry.job?.jobType ?? "job")}
                    disabled={retryingId === entry.id}
                    className={`${primaryButtonClassName} px-3 py-1.5 text-xs`}
                  >
                    {retryingId === entry.id ? "Retrying..." : "Retry"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages}
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
    </div>
  );
}
