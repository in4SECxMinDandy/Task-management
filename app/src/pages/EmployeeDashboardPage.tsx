import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  isOverdue,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import type { Task } from "@/types/database";
import { cn } from "@/lib/utils";

export function EmployeeDashboardPage() {
  const { profile } = useAuth();

  const { data = [] } = useQuery({
    queryKey: ["my-tasks", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile!.id)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const pending = data.filter((t) => t.status === "pending");
  const inProgress = data.filter((t) => t.status === "in_progress");
  const submitted = data.filter((t) => t.status === "submitted");
  const completed = data.filter((t) => t.status === "approved");
  const overdue = data.filter((t) => isOverdue(t.deadline, t.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Xin chào, {profile?.full_name?.split(" ").slice(-1)[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Tổng quan công việc của bạn.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Mới giao" value={pending.length} icon={ListTodo} />
        <StatCard label="Đang làm" value={inProgress.length} icon={Clock} accent="info" />
        <StatCard label="Đã nộp" value={submitted.length} icon={Send} accent="warning" />
        <StatCard label="Hoàn thành" value={completed.length} icon={CheckCircle2} accent="success" />
        <StatCard
          label="Quá hạn"
          value={overdue.length}
          icon={AlertTriangle}
          accent={overdue.length > 0 ? "destructive" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cần làm gấp</CardTitle>
        </CardHeader>
        <CardContent>
          {[...overdue, ...pending, ...inProgress].length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tuyệt vời! Bạn không có việc tồn đọng.
            </p>
          ) : (
            <ul className="space-y-2">
              {[...overdue, ...pending, ...inProgress].slice(0, 8).map((t) => {
                const od = isOverdue(t.deadline, t.status);
                return (
                  <li key={t.id}>
                    <Link to={`/tasks/${t.id}`}>
                      <Card className="transition-colors hover:bg-accent/40">
                        <CardContent className="flex items-center justify-between gap-4 p-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{t.title}</span>
                              <Badge variant={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                              <Badge variant={PRIORITY_COLOR[t.priority]}>
                                {PRIORITY_LABEL[t.priority]}
                              </Badge>
                              {od && <Badge variant="destructive">Quá hạn</Badge>}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Hạn: {formatDateTime(t.deadline)}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress className="w-32" value={t.progress} />
                              <span className="text-xs text-muted-foreground">{t.progress}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
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
  accent?: "info" | "warning" | "success" | "destructive";
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
            accent === "destructive" && "bg-destructive/10 text-destructive",
            !accent && "bg-muted text-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
