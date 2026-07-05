import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  accentClassName?: string;
}

export function StatCard({ label, value, sublabel, accentClassName }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-[var(--text-secondary)]/30">
      <div className="text-xs font-medium tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div
        className={`mt-2 font-display text-[28px] font-semibold leading-none tabular-nums text-[var(--text-primary)] ${accentClassName ?? ""}`}
      >
        {value}
      </div>
      {sublabel && <div className="mt-2 text-xs text-[var(--text-secondary)]">{sublabel}</div>}
    </div>
  );
}
