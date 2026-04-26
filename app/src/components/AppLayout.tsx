import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Bell,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/NotificationsBell";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/tasks", label: "Công việc", icon: ListTodo },
  { to: "/employees", label: "Nhân viên", icon: Users, adminOnly: true },
  { to: "/settings", label: "Cài đặt", icon: SettingsIcon },
];

export function AppLayout() {
  const { profile, signOut, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            {!collapsed && <span className="truncate text-sm font-semibold">QL Công Việc</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2", collapsed && "justify-center")}
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span>{theme === "dark" ? "Sáng" : "Tối"}</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b bg-background px-4">
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback>{initials(profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <div className="text-xs font-medium leading-tight">{profile?.full_name}</div>
                  <div className="text-[11px] capitalize leading-tight text-muted-foreground">
                    {profile?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <SettingsIcon className="h-4 w-4" /> Cài đặt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/notifications")}>
                <Bell className="h-4 w-4" /> Thông báo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" /> Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
