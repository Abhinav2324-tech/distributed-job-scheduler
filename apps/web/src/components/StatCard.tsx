import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  accentClassName?: string;
  icon?: ReactNode;
  /** CSS color (usually a --color-status-* var) used for the icon chip and top rule. */
  tint?: string;
}

export function StatCard({ label, value, sublabel, accentClassName, icon, tint }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-[var(--text-secondary)]/30">
      {tint && (
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: tint }} aria-hidden="true" />
      )}
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium tracking-wide text-[var(--text-secondary)]">{label}</div>
        {icon && (
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: tint ? `color-mix(in srgb, ${tint} 16%, transparent)` : undefined, color: tint }}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        className={`mt-2 font-display text-[28px] font-semibold leading-none tabular-nums text-[var(--text-primary)] ${accentClassName ?? ""}`}
      >
        {value}
      </div>
      {sublabel && <div className="mt-2 text-xs text-[var(--text-secondary)]">{sublabel}</div>}
    </div>
  );
}
