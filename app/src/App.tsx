import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute, RequireRole } from "@/components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { InactivePage } from "@/pages/InactivePage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { EmployeeDashboardPage } from "@/pages/EmployeeDashboardPage";
import { EmployeesPage } from "@/pages/admin/EmployeesPage";
import { EmployeeDetailPage } from "@/pages/admin/EmployeeDetailPage";
import { AuditLogPage } from "@/pages/admin/AuditLogPage";
import { TasksPage } from "@/pages/TasksPage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";

function HomeRedirect() {
  const { isAdmin, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Không tìm thấy thông tin tài khoản</h2>
          <p className="text-sm text-muted-foreground">Tài khoản chưa có hồ sơ trong hệ thống.</p>
          <p className="text-sm text-muted-foreground">Vui lòng chạy seed SQL trong Supabase Dashboard.</p>
        </div>
      </div>
    );
  }
  return isAdmin ? <AdminDashboardPage /> : <EmployeeDashboardPage />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/inactive" element={<InactivePage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            <Route element={<RequireRole role="admin" />}>
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
