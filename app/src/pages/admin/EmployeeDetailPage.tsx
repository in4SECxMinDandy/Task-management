import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Building2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { initials, formatDate, formatDateTime } from "@/lib/utils";
import { isOverdue, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import type { EmployeePerformance, Profile, Task } from "@/types/database";

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const profileQ = useQuery({
    queryKey: ["profile", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const perfQ = useQuery({
    queryKey: ["employee-performance", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_performance")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as EmployeePerformance | null;
    },
  });

  const tasksQ = useQuery({
    queryKey: ["employee-tasks", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const profile = profileQ.data;
  const tasks = tasksQ.data ?? [];

  const inProgress = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const overdueList = tasks.filter((t) => isOverdue(t.deadline, t.status));
  const submittedList = tasks.filter((t) => t.status === "submitted");
  const doneList = tasks.filter((t) => t.status === "approved");

  if (profileQ.isLoading || !profile) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const perf = perfQ.data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/employees">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>
      </Button>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{profile.full_name}</h1>
              <Badge variant={profile.role === "admin" ? "info" : "secondary"}>
                {profile.role === "admin" ? "Quản trị" : "Nhân viên"}
              </Badge>
              {profile.is_active ? (
                <Badge variant="success">Hoạt động</Badge>
              ) : (
                <Badge variant="destructive">Vô hiệu</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {profile.email}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {profile.department ?? "—"}
              </span>
            </div>
          </div>
          {perf && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Đang làm" value={perf.in_progress_tasks} />
              <Stat label="Hoàn thành" value={perf.completed_tasks} />
              <Stat label="Quá hạn" value={perf.overdue_tasks} accent="destructive" />
            </div>
          )}
        </CardContent>
      </Card>

      {perf && (
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất tổng quan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <Metric label="Điểm hiệu suất" value={perf.performance_score?.toFixed(0) ?? "—"} suffix="/ 100" />
            <Metric label="Tỷ lệ đúng hạn" value={perf.on_time_rate?.toFixed(0) ?? "—"} suffix="%" />
            <Metric label="Tỷ lệ duyệt" value={perf.approval_rate?.toFixed(0) ?? "—"} suffix="%" />
            <Metric label="Tổng task được giao" value={perf.total_tasks.toString()} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="in_progress">
        <TabsList>
          <TabsTrigger value="in_progress">Đang làm ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:text-destructive">
            Quá hạn ({overdueList.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">Chờ duyệt ({submittedList.length})</TabsTrigger>
          <TabsTrigger value="done">Hoàn thành ({doneList.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="in_progress">
          <TaskList tasks={inProgress} emptyText="Không có công việc đang làm" />
        </TabsContent>
        <TabsContent value="overdue">
          <TaskList tasks={overdueList} emptyText="Không có công việc quá hạn" />
        </TabsContent>
        <TabsContent value="submitted">
          <TaskList tasks={submittedList} emptyText="Không có công việc chờ duyệt" />
        </TabsContent>
        <TabsContent value="done">
          <TaskList tasks={doneList} emptyText="Chưa hoàn thành công việc nào" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "destructive" }) {
  return (
    <div>
      <div className={"text-xl font-semibold " + (accent === "destructive" ? "text-destructive" : "")}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TaskList({ tasks, emptyText }: { tasks: Task[]; emptyText: string }) {
  if (tasks.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const overdue = isOverdue(t.deadline, t.status);
        return (
          <Link key={t.id} to={`/tasks/${t.id}`}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.title}</span>
                    <Badge variant={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                    <Badge variant={PRIORITY_COLOR[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                    {overdue && <Badge variant="destructive">Quá hạn</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Hạn: {formatDateTime(t.deadline)} · Tạo: {formatDate(t.created_at)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress className="w-40" value={t.progress} />
                    <span className="text-xs text-muted-foreground">{t.progress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
