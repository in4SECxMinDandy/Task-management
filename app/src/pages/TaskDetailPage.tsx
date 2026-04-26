import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  isOverdue,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  formatBytes,
} from "@/lib/format";
import { formatDateTime, initials, formatRelative } from "@/lib/utils";
import { getSignedUrl, uploadTaskFile } from "@/lib/storage";
import type {
  Profile,
  Task,
  TaskAttachment,
  TaskComment,
  TaskStatus,
} from "@/types/database";

type CommentWithUser = TaskComment & { user: Pick<Profile, "id" | "full_name"> | null };

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuth();

  const [progress, setProgress] = useState<number>(0);
  const [submissionNote, setSubmissionNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const taskQ = useQuery({
    queryKey: ["task", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, email), creator:profiles!tasks_created_by_fkey(id, full_name)",
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Task & {
        assignee: Pick<Profile, "id" | "full_name" | "email"> | null;
        creator: Pick<Profile, "id" | "full_name"> | null;
      };
    },
  });

  const attachmentsQ = useQuery({
    queryKey: ["task-attachments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", id!)
        .order("uploaded_at");
      if (error) throw error;
      return data as TaskAttachment[];
    },
  });

  const commentsQ = useQuery({
    queryKey: ["task-comments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*, user:profiles!task_comments_user_id_fkey(id, full_name)")
        .eq("task_id", id!)
        .order("created_at");
      if (error) throw error;
      return data as CommentWithUser[];
    },
  });

  useEffect(() => {
    if (taskQ.data) {
      setProgress(taskQ.data.progress);
      setSubmissionNote(taskQ.data.submission_note ?? "");
    }
  }, [taskQ.data]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`task-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["task", id] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments", filter: `task_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["task-comments", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_attachments", filter: `task_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["task-attachments", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  if (taskQ.isLoading || !taskQ.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const task = taskQ.data;
  const isAdmin = profile?.role === "admin";
  const isAssignee = profile?.id === task.assigned_to;
  const overdue = isOverdue(task.deadline, task.status);
  const attachments = attachmentsQ.data ?? [];
  const assignmentFiles = attachments.filter((a) => a.kind === "assignment");
  const submissionFiles = attachments.filter((a) => a.kind === "submission");

  const updateStatus = async (status: TaskStatus, extras: Partial<Task> = {}) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("tasks").update({ status, ...extras }).eq("id", task.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["employee-performance"] });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  };

  const onSaveProgress = async () => {
    setBusy(true);
    try {
      const status = task.status === "pending" && progress > 0 ? "in_progress" : task.status;
      const { error } = await supabase
        .from("tasks")
        .update({ progress, status })
        .eq("id", task.id);
      if (error) throw error;
      toast.success("Đã cập nhật tiến độ");
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  };

  const onUploadSubmission = async (file: File) => {
    if (!profile) return;
    setBusy(true);
    try {
      const path = await uploadTaskFile(task.id, file, "submission");
      const { error } = await supabase.from("task_attachments").insert({
        task_id: task.id,
        kind: "submission",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: profile.id,
      });
      if (error) throw error;
      toast.success("Đã tải lên file nộp");
      qc.invalidateQueries({ queryKey: ["task-attachments", id] });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Tải lên thất bại");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    await updateStatus("submitted", {
      submitted_at: new Date().toISOString(),
      submission_note: submissionNote || null,
      progress: 100,
    });
    toast.success("Đã nộp công việc");
  };

  const onApprove = async () => {
    await updateStatus("approved", {
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile?.id ?? null,
      review_note: reviewNote || null,
      progress: 100,
    });
    toast.success("Đã phê duyệt");
  };

  const onReject = async () => {
    if (!reviewNote.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    await updateStatus("rejected", {
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile?.id ?? null,
      review_note: reviewNote,
    });
    toast.success("Đã từ chối, yêu cầu nhân viên nộp lại");
  };

  const onComment = async () => {
    if (!comment.trim() || !profile) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("task_comments").insert({
        task_id: task.id,
        user_id: profile.id,
        content: comment.trim(),
      });
      if (error) throw error;
      setComment("");
      qc.invalidateQueries({ queryKey: ["task-comments", id] });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Gửi bình luận thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Button>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{task.title}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant={STATUS_COLOR[task.status]}>{STATUS_LABEL[task.status]}</Badge>
                <Badge variant={PRIORITY_COLOR[task.priority]}>
                  Ưu tiên: {PRIORITY_LABEL[task.priority]}
                </Badge>
                {overdue && <Badge variant="destructive">Quá hạn</Badge>}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Hạn: {formatDateTime(task.deadline)}</div>
              <div>Tạo: {formatDateTime(task.created_at)}</div>
            </div>
          </div>

          {task.description && (
            <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Người giao</div>
              <Link to={`/employees/${task.creator?.id ?? ""}`} className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{initials(task.creator?.full_name)}</AvatarFallback>
                </Avatar>
                <span>{task.creator?.full_name ?? "—"}</span>
              </Link>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Người thực hiện</div>
              <Link to={`/employees/${task.assignee?.id ?? ""}`} className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{initials(task.assignee?.full_name)}</AvatarFallback>
                </Avatar>
                <span>{task.assignee?.full_name ?? "—"}</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Tiến độ</Label>
              <span className="text-xs">{task.progress}%</span>
            </div>
            <Progress value={task.progress} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Paperclip className="h-4 w-4" /> File giao việc
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignmentFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không có file đính kèm.</p>
            ) : (
              <ul className="space-y-1">
                {assignmentFiles.map((a) => (
                  <AttachmentRow key={a.id} attachment={a} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" /> File nộp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {submissionFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có file nộp.</p>
            ) : (
              <ul className="space-y-1">
                {submissionFiles.map((a) => (
                  <AttachmentRow key={a.id} attachment={a} />
                ))}
              </ul>
            )}
            {(isAssignee || isAdmin) && task.status !== "approved" && (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted">
                <Upload className="h-3 w-3" /> Thêm file nộp
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadSubmission(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>
      </div>

      {isAssignee && task.status !== "approved" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cập nhật tiến độ & Nộp công việc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Tiến độ ({progress}%)</Label>
              <Input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Ghi chú khi nộp (tùy chọn)</Label>
              <Textarea
                rows={3}
                value={submissionNote}
                onChange={(e) => setSubmissionNote(e.target.value)}
                placeholder="Tóm tắt kết quả, lưu ý cho admin..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSaveProgress} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu tiến độ"}
              </Button>
              <Button onClick={onSubmit} disabled={busy}>
                <Send className="h-4 w-4" /> Nộp công việc
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && task.status === "submitted" && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-sm">Phê duyệt kết quả</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.submission_note && (
              <div>
                <div className="text-xs text-muted-foreground">Ghi chú của nhân viên</div>
                <p className="rounded-md bg-muted p-2 text-sm">{task.submission_note}</p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Nhận xét (bắt buộc nếu từ chối)</Label>
              <Textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="success" onClick={onApprove} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" /> Phê duyệt
              </Button>
              <Button variant="destructive" onClick={onReject} disabled={busy}>
                <XCircle className="h-4 w-4" /> Từ chối
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {task.status === "rejected" && task.review_note && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="space-y-1 p-4">
            <div className="text-xs font-medium text-destructive">Lý do từ chối</div>
            <p className="text-sm">{task.review_note}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" /> Bình luận
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-3">
            {(commentsQ.data ?? []).map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">
                    {initials(c.user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-medium">{c.user?.full_name ?? "?"}</span>
                    <span className="text-muted-foreground">{formatRelative(c.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{c.content}</p>
                </div>
              </li>
            ))}
            {(commentsQ.data ?? []).length === 0 && (
              <li className="text-xs text-muted-foreground">Chưa có bình luận.</li>
            )}
          </ul>
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Viết bình luận..."
            />
            <Button onClick={onComment} disabled={busy || !comment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttachmentRow({ attachment }: { attachment: TaskAttachment }) {
  const [loading, setLoading] = useState(false);
  const onDownload = async () => {
    setLoading(true);
    try {
      const url = await getSignedUrl(attachment.storage_path);
      window.open(url, "_blank");
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Không tải được file");
    } finally {
      setLoading(false);
    }
  };
  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs">
      <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
      <span className="shrink-0 text-muted-foreground">{formatBytes(attachment.file_size)}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDownload} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      </Button>
    </li>
  );
}
