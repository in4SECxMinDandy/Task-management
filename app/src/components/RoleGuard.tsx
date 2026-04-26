import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types/database";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.must_change_password) return <Navigate to="/change-password" replace />;
  if (!profile?.is_active) return <Navigate to="/inactive" replace />;
  return <>{children ?? <Outlet />}</>;
}

export function RequireRole({ role, children }: { role: Role; children?: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (profile?.role !== role) return <Navigate to="/" replace />;
  return <>{children ?? <Outlet />}</>;
}

function FullPageSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}
