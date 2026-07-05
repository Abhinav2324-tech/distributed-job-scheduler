import { useState } from "react";
import { useQueues, useSetQueuePaused } from "../hooks/useQueues";
import { useProjects } from "../hooks/useProjects";
import { QueueFormModal } from "../components/QueueFormModal";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { useToast } from "../contexts/ToastContext";
import type { Queue } from "../types";

export function QueuesPage() {
  const { data, isLoading, isError } = useQueues();
  const { data: projectsResult } = useProjects();
  const setPaused = useSetQueuePaused();
  const { showToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const hasProjects = (projectsResult?.data.length ?? 0) > 0;

  async function togglePause(queue: Queue) {
    try {
      await setPaused.mutateAsync({ id: queue.id, isPaused: !queue.isPaused });
      showToast(queue.isPaused ? `Resumed "${queue.name}"` : `Paused "${queue.name}"`, "success");
    } catch {
      showToast("Failed to update queue", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Queues</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Live counts update automatically as jobs move through each queue.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateProject(true)}
            className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            New project
          </button>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!hasProjects}
            title={hasProjects ? undefined : "Create a project first"}
            className="rounded-md bg-status-running px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Create queue
          </button>
        </div>
      </div>

      {!hasProjects && (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-secondary)]">
          You don't have any projects yet. Create one first - every queue belongs to a project.
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Concurrency</th>
              <th className="px-4 py-3 font-medium">Queued</th>
              <th className="px-4 py-3 font-medium">Running</th>
              <th className="px-4 py-3 font-medium">Failed</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  Loading queues...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-status-dead-letter">
                  Failed to load queues.
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                  No queues yet. Create one to get started.
                </td>
              </tr>
            )}
            {data?.data.map((queue) => (
              <tr key={queue.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{queue.name}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{queue.project?.name ?? "-"}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{queue.priority}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{queue.maxConcurrency}</td>
                <td className="px-4 py-3 tabular-nums text-status-queued">{queue.stats?.queued ?? 0}</td>
                <td className="px-4 py-3 tabular-nums text-status-running">{queue.stats?.running ?? 0}</td>
                <td className="px-4 py-3 tabular-nums text-status-failed">{queue.stats?.failed ?? 0}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => togglePause(queue)}
                    className={
                      queue.isPaused
                        ? "rounded-full border border-status-failed/30 bg-status-failed/10 px-2.5 py-0.5 text-xs font-medium text-status-failed"
                        : "rounded-full border border-status-completed/30 bg-status-completed/10 px-2.5 py-0.5 text-xs font-medium text-status-completed"
                    }
                  >
                    {queue.isPaused ? "Paused" : "Active"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingQueue(queue)}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <QueueFormModal onClose={() => setShowCreate(false)} />}
      {editingQueue && <QueueFormModal queue={editingQueue} onClose={() => setEditingQueue(null)} />}
      {showCreateProject && <ProjectFormModal onClose={() => setShowCreateProject(false)} />}
    </div>
  );
}
