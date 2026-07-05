import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  accentClassName?: string;
}

export function StatCard({ label, value, sublabel, accentClassName }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
      <div className="text-xs font-medium text-[var(--text-secondary)]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold text-[var(--text-primary)] ${accentClassName ?? ""}`}>
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-[var(--text-secondary)]">{sublabel}</div>}
    </div>
  );
}
