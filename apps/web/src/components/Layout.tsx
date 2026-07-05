import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "./Logo";
import {
  DeadLetterIcon,
  JobsIcon,
  MoonIcon,
  OverviewIcon,
  QueuesIcon,
  SunIcon,
  WorkersIcon,
} from "./icons";

const NAV_ITEMS: Array<{
  to: string;
  label: string;
  end?: boolean;
  tint: string;
  icon: (p: { className?: string; style?: CSSProperties }) => ReactNode;
}> = [
  { to: "/", label: "Overview", end: true, tint: "var(--color-status-completed)", icon: (p) => <OverviewIcon {...p} /> },
  { to: "/queues", label: "Queues", tint: "var(--color-status-scheduled)", icon: (p) => <QueuesIcon {...p} /> },
  { to: "/jobs", label: "Jobs", tint: "var(--color-status-running)", icon: (p) => <JobsIcon {...p} /> },
  { to: "/workers", label: "Workers", tint: "var(--brand)", icon: (p) => <WorkersIcon {...p} /> },
  { to: "/dead-letter", label: "Dead Letter Queue", tint: "var(--color-status-dead-letter)", icon: (p) => <DeadLetterIcon {...p} /> },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Layout() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3.5 py-5">
        <Logo className="mb-8 px-2" />

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--surface-sunken)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]/60 hover:text-[var(--text-primary)]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      "absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full transition-opacity",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                    style={{ background: item.tint }}
                  />
                  {item.icon({
                    className: clsx(
                      "h-4 w-4 shrink-0 transition-opacity",
                      isActive ? "opacity-100" : "opacity-60 group-hover:opacity-90",
                    ),
                    style: { color: item.tint },
                  })}
                  <span className="truncate" style={{ color: isActive ? item.tint : undefined }}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)]/60 hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          {user && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/15 font-display text-[11px] font-semibold text-[var(--brand)]">
                  {initials(user.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-[var(--text-primary)]">{user.name}</div>
                  <div className="truncate text-[11px] text-[var(--text-secondary)]">{user.email}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="shrink-0 text-[11px] font-medium text-[var(--text-secondary)] hover:text-status-dead-letter"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
