import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { inputClassName, labelClassName, primaryButtonClassName } from "./formStyles";
import { useQueues } from "../hooks/useQueues";
import { useCreateJob } from "../hooks/useJobs";
import { useToast } from "../contexts/ToastContext";
import { ApiRequestError } from "../lib/api";

interface JobFormModalProps {
  /** Pre-select a queue (e.g. opened from the Queues page) and skip the picker. */
  queueId?: string;
  onClose: () => void;
}

export function JobFormModal({ queueId: fixedQueueId, onClose }: JobFormModalProps) {
  const { showToast } = useToast();
  const { data: queuesResult } = useQueues();
  const [queueId, setQueueId] = useState(fixedQueueId ?? "");
  const [jobType, setJobType] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [runAt, setRunAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createJob = useCreateJob(queueId || undefined);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let payload: unknown;
    try {
      payload = payloadText.trim() === "" ? {} : JSON.parse(payloadText);
    } catch {
      setError("Payload must be valid JSON (e.g. {} or { \"to\": \"a@b.com\" }).");
      return;
    }

    try {
      const result = await createJob.mutateAsync({
        jobType,
        payload,
        runAt: runAt ? new Date(runAt).toISOString() : undefined,
      });
      showToast(
        result.deduped
          ? `An identical job was already queued - reusing it`
          : runAt
            ? `"${jobType}" scheduled`
            : `"${jobType}" submitted`,
        "success",
      );
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal title="Submit a job" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg border border-status-dead-letter/30 bg-status-dead-letter/10 px-3 py-2 text-sm text-status-dead-letter">
            {error}
          </div>
        )}

        {!fixedQueueId && (
          <>
            <label className={labelClassName}>Queue</label>
            <select
              required
              value={queueId}
              onChange={(e) => setQueueId(e.target.value)}
              className={`${inputClassName} mb-4`}
            >
              <option value="" disabled>
                Select a queue
              </option>
              {queuesResult?.data.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.project?.name ? `${q.project.name} / ${q.name}` : q.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label className={labelClassName}>Job type</label>
        <input
          required
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className={`${inputClassName} mb-4`}
          placeholder="email"
        />

        <label className={labelClassName}>Payload (JSON)</label>
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={4}
          spellCheck={false}
          className={`${inputClassName} mb-4 font-mono text-xs`}
          placeholder={'{ "to": "user@example.com" }'}
        />

        <label className={labelClassName}>Run at (optional - leave blank to run immediately)</label>
        <input
          type="datetime-local"
          value={runAt}
          onChange={(e) => setRunAt(e.target.value)}
          className={`${inputClassName} mb-6`}
        />

        <button type="submit" disabled={createJob.isPending || !queueId} className={`${primaryButtonClassName} w-full`}>
          {createJob.isPending ? "Submitting..." : runAt ? "Schedule job" : "Submit job"}
        </button>
      </form>
    </Modal>
  );
}
