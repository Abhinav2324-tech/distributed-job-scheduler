import type { ReactNode } from "react";
import { Logo, LogoMark } from "./Logo";

interface AuthShellProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

const FEATURES = [
  [
    "Atomic claiming",
    "No two workers ever process the same job, even under heavy concurrency.",
    "var(--brand)",
  ],
  [
    "Automatic retries",
    "Configurable backoff strategies and a dead letter queue for exhausted jobs.",
    "var(--color-status-scheduled)",
  ],
  [
    "Live visibility",
    "Queue depth, throughput, and worker health update in real time.",
    "var(--color-status-failed)",
  ],
] as const;

export function AuthShell({ heading, subheading, children }: AuthShellProps) {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[var(--surface-sunken)] px-12 py-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full opacity-[0.16] blur-3xl"
          style={{ background: "var(--brand)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: "var(--color-status-scheduled)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(var(--border-subtle) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 90% 70% at 30% 20%, black 40%, transparent 90%)",
          }}
        />
        <div className="relative">
          <Logo />
          <div className="mt-24 max-w-sm">
            <LogoMark className="h-10 w-10" />
            <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
              Jobs move through your system, not through a spreadsheet.
            </h2>
          </div>
        </div>
        <div className="relative flex flex-col gap-5">
          {FEATURES.map(([title, body, dotColor]) => (
            <div key={title} className="flex gap-3">
              <div
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: dotColor }}
              />
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
                <div className="mt-0.5 text-sm text-[var(--text-secondary)]">{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-7">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {heading}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{subheading}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
