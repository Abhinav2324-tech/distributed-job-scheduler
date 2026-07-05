import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiRequestError } from "../lib/api";
import { AuthShell } from "../components/AuthShell";
import { inputClassName, labelClassName, primaryButtonClassName } from "../components/formStyles";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ orgName, name, email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell heading="Create your account" subheading="Sets up a new organization for your team.">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg border border-status-dead-letter/30 bg-status-dead-letter/10 px-3 py-2 text-sm text-status-dead-letter">
            {error}
          </div>
        )}

        <label className={labelClassName}>Organization name</label>
        <input
          required
          minLength={2}
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className={`${inputClassName} mb-4`}
          placeholder="Acme Inc"
        />

        <label className={labelClassName}>Your name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClassName} mb-4`}
          placeholder="Ada Lovelace"
        />

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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClassName} mb-6`}
          placeholder="At least 8 characters"
        />

        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} w-full`}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-[var(--brand)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
