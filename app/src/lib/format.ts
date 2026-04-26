import type { Priority, TaskStatus } from "@/types/database";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Mới giao",
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  approved: "Hoàn thành",
  rejected: "Bị từ chối",
};

export const STATUS_COLOR: Record<TaskStatus, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  pending: "secondary",
  in_progress: "info",
  submitted: "warning",
  approved: "success",
  rejected: "destructive",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Thấp",
  medium: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export const PRIORITY_COLOR: Record<Priority, "secondary" | "info" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  urgent: "destructive",
};

export function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function isOverdue(deadline: string | null, status: TaskStatus): boolean {
  if (!deadline) return false;
  if (status === "approved" || status === "rejected") return false;
  return new Date(deadline).getTime() < Date.now();
}
