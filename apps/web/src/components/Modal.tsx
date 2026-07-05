import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
