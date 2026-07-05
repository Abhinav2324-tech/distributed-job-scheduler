/**
 * Brand mark: three lanes of decreasing fill representing a queue draining
 * from back to front. Deliberately geometric/abstract rather than a literal
 * clock, gear, or bolt - those read as stock icon-pack marks.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="var(--surface-sunken)" />
      <rect x="6" y="8" width="16" height="2.6" rx="1.3" fill="var(--brand)" />
      <rect x="6" y="12.7" width="11" height="2.6" rx="1.3" fill="var(--color-status-scheduled)" />
      <rect x="6" y="17.4" width="6" height="2.6" rx="1.3" fill="var(--color-status-failed)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-6 w-6 shrink-0" />
      <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
        Job Scheduler
      </span>
    </div>
  );
}
