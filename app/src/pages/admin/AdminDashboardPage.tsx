import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { cn, formatDate, initials } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/format";
import type {
  EmployeePerformance,
  Task,
  TaskStatus,
} from "@/types/database";

function performanceStars(score: number | null) {
  if (score == null) return 0;
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export function AdminDashboardPage() {
  const tasksQ = useQuery({
    queryKey: ["admin-tasks-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, status, deadline, priority, created_at, updated_at");
      if (error) throw error;
      return data as Pick<Task, "id" | "status" | "deadline" | "priority" | "created_at" | "updated_at">[];
    },
  });

  const perfQ = useQuery({
    queryKey: ["employee-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_performance")
        .select("*")
        .order("performance_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as EmployeePerformance[];
    },
  });

  const upcomingQ = useQuery({
    queryKey: ["admin-upcoming"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const in3d = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, deadline, status, assigned_to, profiles:assigned_to(full_name)")
        .gte("deadline", now)
        .lte("deadline", in3d)
        .in("status", ["pending", "in_progress", "submitted"])
        .order("deadline");
      if (error) throw error;
      return data as unknown as Array<
        Pick<Task, "id" | "title" | "deadline" | "status" | "assigned_to"> & {
          profiles: { full_name: string } | null;
        }
      >;
    },
  });

  const overdueQ = useQuery({
    queryKey: ["admin-overdue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, deadline, status, assigned_to, profiles:assigned_to(full_name)")
        .lt("deadline", new Date().toISOString())
        .in("status", ["pending", "in_progress"])
        .order("deadline");
      if (error) throw error;
      return data as unknown as Array<
        Pick<Task, "id" | "title" | "deadline" | "status" | "assigned_to"> & {
          profiles: { full_name: string } | null;
        }
      >;
    },
  });

  const tasks = tasksQ.data ?? [];
  const perf = perfQ.data ?? [];

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "pending").length;
  const submitted = tasks.filter((t) => t.status === "submitted").length;
  const completed = tasks.filter((t) => t.status === "approved").length;
  const overdue = tasks.filter(
    (t) =>
      t.deadline &&
      new Date(t.deadline) < new Date() &&
      t.status !== "approved" &&
      t.status !== "rejected",
  ).length;

  const statusData = (
    ["pending", "in_progress", "submitted", "approved", "rejected"] as TaskStatus[]
  ).map((s) => ({ name: STATUS_LABEL[s], value: tasks.filter((t) => t.status === s).length }));
  const statusColors = ["#94a3b8", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

  const priorityData = ["low", "medium", "high", "urgent"].map((p) => ({
    name: p,
    value: tasks.filter((t) => t.priority === p).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">
          Đánh giá hiệu suất nhân viên và tiến độ công việc của toàn bộ hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng công việc" value={total} icon={ListTodo} />
        <StatCard label="Đang làm" value={inProgress} icon={Clock} accent="info" />
        <StatCard label="Chờ duyệt" value={submitted} icon={TrendingUp} accent="warning" />
        <StatCard label="Hoàn thành" value={completed} icon={CheckCircle2} accent="success" />
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Có <strong>{overdue}</strong> công việc đang quá hạn cần xử lý.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Phân bổ trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={statusColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" /> Phân bổ theo mức ưu tiên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="oklch(0.488 0.243 264.376)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Hiệu suất nhân viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          {perfQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : perf.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có nhân viên.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Nhân viên</th>
                    <th className="py-2">Đang làm</th>
                    <th className="py-2">Hoàn thành</th>
                    <th className="py-2">Quá hạn</th>
                    <th className="py-2">On-time</th>
                    <th className="py-2 w-48">Tiến độ chung</th>
                    <th className="py-2">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.map((p) => {
                    const stars = performanceStars(p.performance_score);
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link to={`/employees/${p.id}`} className="flex items-center gap-2 hover:underline">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{p.full_name}</div>
                              <div className="text-xs text-muted-foreground">{p.email}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2">{p.in_progress_tasks}</td>
                        <td className="py-2">{p.completed_tasks}</td>
                        <td className="py-2">
                          <Badge variant={p.overdue_tasks > 0 ? "destructive" : "secondary"}>
                            {p.overdue_tasks}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {p.on_time_rate != null ? `${p.on_time_rate.toFixed(0)}%` : "—"}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <Progress
                              className="w-32"
                              value={
                                p.total_tasks > 0
                                  ? Math.round((p.completed_tasks / p.total_tasks) * 100)
                                  : 0
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {p.completed_tasks}/{p.total_tasks}
                            </span>
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i < stars ? "fill-warning text-warning" : "text-muted-foreground/30",
                                )}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Sắp đến hạn (3 ngày)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(upcomingQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có công việc sắp đến hạn.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingQ.data?.map((t) => (
                  <li key={t.id}>
                    <Link to={`/tasks/${t.id}`} className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-accent">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.profiles?.full_name ?? "—"} · {formatDate(t.deadline)}
                        </div>
                      </div>
                      <Badge variant="warning">{STATUS_LABEL[t.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Đang quá hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(overdueQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có công việc quá hạn.</p>
            ) : (
              <ul className="space-y-2">
                {overdueQ.data?.map((t) => (
                  <li key={t.id}>
                    <Link to={`/tasks/${t.id}`} className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-accent">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.profiles?.full_name ?? "—"} · hết hạn {formatDate(t.deadline)}
                        </div>
                      </div>
                      <Badge variant="destructive">Quá hạn</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "info" | "warning" | "success";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accent === "info" && "bg-info/10 text-info",
            accent === "warning" && "bg-warning/10 text-warning",
            accent === "success" && "bg-success/10 text-success",
            !accent && "bg-muted text-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
