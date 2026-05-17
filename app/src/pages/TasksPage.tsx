import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { deleteTaskWithFiles } from "@/lib/storage";
import type { Task, TaskStatus } from "@/types/database";
import { CreateTaskDialog } from "./admin/CreateTaskDialog";

export function TasksPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaskWithFiles(deleteTarget.id);
      toast.success("Đã xóa công việc");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Xóa thất bại");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  type TaskRow = Task & {
    assignees: Array<{ user_id: string; user: { full_name: string; email: string } | null }>;
  };

  const { data = [], isLoading } = useQuery<TaskRow[]>({
    queryKey: ["tasks", isAdmin, statusFilter],
    queryFn: async () => {
      // RLS already restricts non-admin users to tasks where they are an
      // assignee or the creator, so we don't need an explicit filter here.
      let q = supabase
        .from("tasks")
        .select(
          "*, assignees:task_assignees(user_id, user:profiles!task_assignees_user_id_fkey(full_name, email))",
        )
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TaskRow[];
    },
  });

  const filtered = data.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q) ||
      t.assignees.some((a) => (a.user?.full_name ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Công việc"
        description={
          isAdmin
            ? "Tất cả công việc trong hệ thống."
            : "Danh sách công việc bạn được giao."
        }
        actions={
          isAdmin && (
            <Button size="lg" className="text-base h-11 px-6" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-5 w-5" /> Tạo công việc
            </Button>
          )
        }
      />

      {/* Filters / search row — placed directly under the title per the
          F-pattern: users scan title → primary action → filters. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-10 text-base"
            placeholder="Tìm theo tiêu đề, mô tả, người được giao..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}>
          <SelectTrigger className="h-11 w-48 text-base">
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
        // Skeleton loading instead of generic spinner — gives the user a
        // preview of where content will appear (Design System §2).
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={ListTodo}
              title={
                search || statusFilter !== "all"
                  ? "Không tìm thấy công việc phù hợp"
                  : "Chưa có công việc nào"
              }
              description={
                search || statusFilter !== "all"
                  ? "Thử bỏ bộ lọc hoặc tìm kiếm với từ khoá khác."
                  : isAdmin
                  ? "Bắt đầu bằng cách tạo công việc đầu tiên cho nhân viên."
                  : "Khi quản trị viên giao việc, công việc sẽ hiển thị ở đây."
              }
              action={
                isAdmin && !search && statusFilter === "all" ? (
                  <Button size="lg" className="mt-4 text-base h-11 px-6" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-5 w-5" /> Tạo công việc
                  </Button>
                ) : (search || statusFilter !== "all") ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="mt-4 text-base h-11"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                  >
                    Xoá bộ lọc
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((t) => {
            const overdue = isOverdue(t.deadline, t.status);
            return (
              <div key={t.id} className="relative">
                <Link to={`/tasks/${t.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-accent/40 active:bg-accent/60">
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
                        <AssigneesSummary assignees={t.assignees} />
                        <div className="flex items-center gap-2">
                          <Progress className="w-24" value={t.progress} />
                          <span className="text-xs text-muted-foreground">{t.progress}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteTarget({ id: t.id, title: t.title });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />}

      {isAdmin && (
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa công việc này?</AlertDialogTitle>
              <AlertDialogDescription>
                Toàn bộ file đính kèm, bình luận và lịch sử của công việc{" "}
                <strong>"{deleteTarget?.title}"</strong> sẽ bị xóa vĩnh viễn. Không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onConfirmDelete}
                disabled={deleting}
              >
                Xóa vĩnh viễn
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function AssigneesSummary({
  assignees,
}: {
  assignees: Array<{ user_id: string; user: { full_name: string; email: string } | null }>;
}) {
  if (assignees.length === 0) {
    return <span className="text-xs text-muted-foreground">— chưa có người làm</span>;
  }
  const max = 3;
  const visible = assignees.slice(0, max);
  const extra = assignees.length - visible.length;
  const names = assignees.map((a) => a.user?.full_name ?? "?").join(", ");
  return (
    <div className="flex min-w-0 items-center gap-2" title={names}>
      <div className="flex -space-x-2">
        {visible.map((a) => (
          <Avatar
            key={a.user_id}
            className="h-6 w-6 border-2 border-background"
          >
            <AvatarFallback className="text-[10px]">
              {initials(a.user?.full_name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 && (
          <span className="z-10 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-muted px-1 text-[10px] text-muted-foreground">
            +{extra}
          </span>
        )}
      </div>
      <span className="truncate text-xs">
        {assignees.length === 1
          ? assignees[0].user?.full_name ?? "—"
          : `${assignees.length} người`}
      </span>
    </div>
  );
}
