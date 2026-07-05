import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
