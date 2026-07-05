import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError } from "../lib/api";
import { AuthShell } from "../components/AuthShell";
import { inputClassName, labelClassName, primaryButtonClassName } from "../components/formStyles";

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
    <AuthShell heading="Welcome back" subheading="Sign in to keep an eye on your queues.">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg border border-status-dead-letter/30 bg-status-dead-letter/10 px-3 py-2 text-sm text-status-dead-letter">
            {error}
          </div>
        )}

        <label className={labelClassName}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClassName} mb-4`}
          placeholder="you@company.com"
        />

        <label className={labelClassName}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClassName} mb-6`}
          placeholder="••••••••"
        />

        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} w-full`}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">
        No account?{" "}
        <Link to="/register" className="font-medium text-[var(--brand)] hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
