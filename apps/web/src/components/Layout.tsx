import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/queues", label: "Queues" },
  { to: "/jobs", label: "Jobs" },
  { to: "/workers", label: "Workers" },
  { to: "/dead-letter", label: "Dead Letter Queue" },
];

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
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-5">
        <div className="mb-8 px-2 text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          Job Scheduler
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--border-subtle)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/60 hover:text-[var(--text-primary)]",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={toggleTheme}
          className="mb-2 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? "Switch to light" : "Switch to dark"}
        </button>
        {user && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-[var(--text-primary)]">{user.name}</div>
              <div className="truncate text-[11px] text-[var(--text-secondary)]">{user.email}</div>
            </div>
            <button
              onClick={logout}
              className="shrink-0 text-xs font-medium text-[var(--text-secondary)] hover:text-status-dead-letter"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
