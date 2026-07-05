import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { inputClassName, labelClassName } from "./formStyles";
import { useCreateProject } from "../hooks/useProjects";
import { useToast } from "../contexts/ToastContext";
import { ApiRequestError } from "../lib/api";

export function ProjectFormModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createProject.mutateAsync({ name, description: description || undefined });
      showToast(`Project "${name}" created`, "success");
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal title="Create project" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-md border border-status-dead-letter/30 bg-status-dead-letter/10 px-3 py-2 text-sm text-status-dead-letter">
            {error}
          </div>
        )}

        <label className={labelClassName}>Project name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClassName} mb-4`}
          placeholder="Payments"
        />

        <label className={labelClassName}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClassName} mb-6`}
          rows={3}
          placeholder="What this project is for"
        />

        <button
          type="submit"
          disabled={createProject.isPending}
          className="w-full rounded-md bg-status-running px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {createProject.isPending ? "Creating..." : "Create project"}
        </button>
      </form>
    </Modal>
  );
}
