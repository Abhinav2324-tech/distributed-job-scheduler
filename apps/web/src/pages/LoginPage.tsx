import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Job Scheduler
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6"
        >
          {error && (
            <div className="mb-4 rounded-md border border-status-dead-letter/30 bg-status-dead-letter/10 px-3 py-2 text-sm text-status-dead-letter">
              {error}
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-status-running"
            placeholder="you@company.com"
          />

          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-status-running"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-status-running px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
          No account?{" "}
          <Link to="/register" className="font-medium text-status-running hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
