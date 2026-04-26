import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types/database";
import { formatRelative } from "@/lib/utils";

export function NotificationsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["all-notifications", session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
  });

  const markAllRead = async () => {
    if (!session) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["all-notifications", session.user.id] });
    qc.invalidateQueries({ queryKey: ["notifications", session.user.id] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Thông báo"
        description="Tất cả thông báo về công việc, phê duyệt và bình luận."
        actions={
          data.some((n) => !n.is_read) && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Đánh dấu tất cả đã đọc
            </Button>
          )
        }
      />

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={BellOff}
              title="Bạn chưa có thông báo nào"
              description="Thông báo về công việc, phê duyệt, bình luận sẽ hiển thị tại đây."
            />
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-1">
          {data.map((n) => (
            <li key={n.id}>
              <Card
                className="cursor-pointer transition-colors hover:bg-accent/40 active:bg-accent/60"
                onClick={async () => {
                  if (!n.is_read) {
                    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
                    qc.invalidateQueries({ queryKey: ["all-notifications", session!.user.id] });
                    qc.invalidateQueries({ queryKey: ["notifications", session!.user.id] });
                  }
                  if (n.task_id) navigate(`/tasks/${n.task_id}`);
                }}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" />}
                  <div className="flex-1">
                    <p className={n.is_read ? "text-muted-foreground" : ""}>{n.message}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
