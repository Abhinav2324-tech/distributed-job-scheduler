import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { inputClassName, labelClassName } from "./formStyles";
import { useProjects } from "../hooks/useProjects";
import { useRetryPolicies } from "../hooks/useRetryPolicies";
import { useCreateQueue, useUpdateQueue } from "../hooks/useQueues";
import { useToast } from "../contexts/ToastContext";
import { ApiRequestError } from "../lib/api";
import type { Queue } from "../types";

interface QueueFormModalProps {
  queue?: Queue;
  onClose: () => void;
}

export function QueueFormModal({ queue, onClose }: QueueFormModalProps) {
  const isEdit = !!queue;
  const { showToast } = useToast();
  const { data: projectsResult } = useProjects();
  const [projectId, setProjectId] = useState(queue?.projectId ?? "");
  const [name, setName] = useState(queue?.name ?? "");
  const [priority, setPriority] = useState(queue?.priority ?? 0);
  const [maxConcurrency, setMaxConcurrency] = useState(queue?.maxConcurrency ?? 5);
  const [retryPolicyId, setRetryPolicyId] = useState(queue?.retryPolicyId ?? "");
  const [error, setError] = useState<string | null>(null);

  const { data: retryPolicies } = useRetryPolicies(projectId || undefined);
  const createQueue = useCreateQueue(projectId || undefined);
  const updateQueue = useUpdateQueue();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await updateQueue.mutateAsync({
          id: queue.id,
          input: { priority, maxConcurrency, retryPolicyId: retryPolicyId || null },
        });
        showToast(`Queue "${queue.name}" updated`, "success");
      } else {
        await createQueue.mutateAsync({
          name,
          priority,
          maxConcurrency,
          retryPolicyId: retryPolicyId || undefined,
        });
        showToast(`Queue "${name}" created`, "success");
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    }
  }

  const isSubmitting = createQueue.isPending || updateQueue.isPending;

  return (
    <Modal title={isEdit ? `Edit ${queue.name}` : "Create queue"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-md border border-status-dead-letter/30 bg-status-dead-letter/10 px-3 py-2 text-sm text-status-dead-letter">
            {error}
          </div>
        )}

        {!isEdit && (
          <>
            <label className={labelClassName}>Project</label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${inputClassName} mb-4`}
            >
              <option value="" disabled>
                Select a project
              </option>
              {projectsResult?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <label className={labelClassName}>Queue name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClassName} mb-4`}
              placeholder="emails"
            />
          </>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClassName}>Priority</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Max concurrency</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxConcurrency}
              onChange={(e) => setMaxConcurrency(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
        </div>

        <label className={labelClassName}>Retry policy</label>
        <select
          value={retryPolicyId}
          onChange={(e) => setRetryPolicyId(e.target.value)}
          className={`${inputClassName} mb-6`}
          disabled={!isEdit && !projectId}
        >
          <option value="">System default (3 retries, exponential)</option>
          {retryPolicies?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.backoffStrategy.toLowerCase()}, max {p.maxRetries})
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-status-running px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create queue"}
        </button>
      </form>
    </Modal>
  );
}
