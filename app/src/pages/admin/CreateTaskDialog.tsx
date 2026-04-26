import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadTaskFile } from "@/lib/storage";
import type { Priority, Profile } from "@/types/database";
import { formatBytes } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const employeesQ = useQuery({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDeadline("");
    setPriority("medium");
    setFiles([]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          created_by: profile.id,
          assigned_to: assignedTo,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          priority,
        })
        .select("id")
        .single();
      if (error) throw error;

      for (const f of files) {
        const path = await uploadTaskFile(task!.id, f, "assignment");
        const { error: aErr } = await supabase.from("task_attachments").insert({
          task_id: task!.id,
          kind: "assignment",
          storage_path: path,
          file_name: f.name,
          file_size: f.size,
          mime_type: f.type || null,
          uploaded_by: profile.id,
        });
        if (aErr) throw aErr;
      }

      toast.success("Đã tạo công việc và gửi thông báo");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["admin-tasks-summary"] });
      qc.invalidateQueries({ queryKey: ["employee-performance"] });
      onOpenChange(false);
      reset();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Tạo công việc thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tạo công việc mới</DialogTitle>
          <DialogDescription>Giao việc cho nhân viên kèm deadline và file đính kèm.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết công việc, yêu cầu, output mong đợi..."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Giao cho</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {(employeesQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} {p.role === "admin" ? "(admin)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Mức ưu tiên</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Bình thường</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Đính kèm file</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-muted/40 p-3 text-sm text-muted-foreground hover:bg-muted">
              <Paperclip className="h-4 w-4" />
              <span>Bấm để chọn file (có thể chọn nhiều)</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  setFiles((prev) => [...prev, ...list]);
                  e.target.value = "";
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1 text-xs">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-muted px-2 py-1">
                    <span className="truncate">{f.name} · {formatBytes(f.size)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !assignedTo}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo công việc"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
