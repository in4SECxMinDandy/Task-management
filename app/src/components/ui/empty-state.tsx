import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Optional icon. Defaults to a generic inbox. Pass any lucide icon. */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  /** Call-to-action element — typically a `<Button>`. */
  action?: React.ReactNode;
  /**
   * Visual size:
   *   - `card` (default): vertical block centered inside a Card / panel.
   *   - `inline`:         compact version for table cells / small panels.
   */
  size?: "card" | "inline";
  className?: string;
}

/**
 * EmptyState (Design System §4 — Smart empty states).
 *
 * Whenever a list / table / page is empty, do NOT just show "Không có dữ liệu".
 * Always offer the user a next step (Call-to-Action) so they aren't stuck.
 *
 * Example:
 *   <EmptyState
 *     title="Chưa có công việc nào"
 *     description="Tạo công việc mới để bắt đầu."
 *     action={<Button onClick={openCreate}><Plus/> Tạo công việc</Button>}
 *   />
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = "card",
  className,
}: EmptyStateProps) {
  if (size === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 py-6 text-center",
          className,
        )}
      >
        <Icon className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-1">{action}</div>}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
