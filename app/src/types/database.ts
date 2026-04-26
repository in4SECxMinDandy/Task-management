/* eslint-disable @typescript-eslint/no-empty-object-type */
// Generated types describing the Supabase schema declared in supabase/migrations.
// Keep in sync with the SQL migrations.

export type Role = "admin" | "employee";
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rejected";
export type AttachmentKind = "assignment" | "submission";
export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_submitted"
  | "task_approved"
  | "task_rejected"
  | "task_commented";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  assigned_to: string | null;
  deadline: string | null;
  priority: Priority;
  status: TaskStatus;
  progress: number;
  submission_note: string | null;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  kind: AttachmentKind;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  by_user: string | null;
  action: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  note: string | null;
  at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  task_id: string | null;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface EmployeePerformance {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  is_active: boolean;
  total_tasks: number;
  in_progress_tasks: number;
  submitted_tasks: number;
  completed_tasks: number;
  rejected_tasks: number;
  overdue_tasks: number;
  on_time_completed: number;
  late_completed: number;
  on_time_rate: number | null;
  approval_rate: number | null;
  performance_score: number | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & {
          id: string;
          full_name: string;
          email: string;
          role: Role;
        };
        Update: Partial<Profile>;
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & { title: string; assigned_to: string };
        Update: Partial<Task>;
      };
      task_attachments: {
        Row: TaskAttachment;
        Insert: Partial<TaskAttachment> & {
          task_id: string;
          kind: AttachmentKind;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<TaskAttachment>;
      };
      task_comments: {
        Row: TaskComment;
        Insert: Partial<TaskComment> & {
          task_id: string;
          user_id: string;
          content: string;
        };
        Update: Partial<TaskComment>;
      };
      task_history: {
        Row: TaskHistory;
        Insert: Partial<TaskHistory> & { task_id: string; action: string };
        Update: Partial<TaskHistory>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & {
          user_id: string;
          type: NotificationType;
          message: string;
        };
        Update: Partial<Notification>;
      };
    };
    Views: {
      employee_performance: {
        Row: EmployeePerformance;
      };
    };
    Functions: {};
    Enums: {};
  };
}
