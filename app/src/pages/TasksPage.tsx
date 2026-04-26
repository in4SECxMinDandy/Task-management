import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { initials, formatDateTime } from "@/lib/utils";
import {
  isOverdue,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/lib/format";
import type { Task, TaskStatus } from "@/types/database";
import { CreateTaskDialog } from "./admin/CreateTaskDialog";

export function TasksPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["tasks", isAdmin, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(full_name, email)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as Array<Task & { assignee: { full_name: string; email: string } | null }>;
    },
  });

  const filtered = data.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q) ||
      (t.assignee?.full_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Công việc</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Tất cả công việc trong hệ thống."
              : "Danh sách công việc bạn được giao."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tạo công việc
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tiêu đề, mô tả, người được giao..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Mới giao</SelectItem>
            <SelectItem value="in_progress">Đang làm</SelectItem>
            <SelectItem value="submitted">Đã nộp</SelectItem>
            <SelectItem value="approved">Hoàn thành</SelectItem>
            <SelectItem value="rejected">Bị từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Không có công việc nào.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((t) => {
            const overdue = isOverdue(t.deadline, t.status);
            return (
              <Link key={t.id} to={`/tasks/${t.id}`}>
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t.title}</div>
                        {t.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={PRIORITY_COLOR[t.priority]}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                      {overdue && <Badge variant="destructive">Quá hạn</Badge>}
                      {t.deadline && <span>Hạn: {formatDateTime(t.deadline)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {initials(t.assignee?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{t.assignee?.full_name ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress className="w-24" value={t.progress} />
                        <span className="text-xs text-muted-foreground">{t.progress}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {isAdmin && <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  );
}
