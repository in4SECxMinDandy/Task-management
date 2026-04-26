import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Thông báo</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (!session) return;
            await supabase
              .from("notifications")
              .update({ is_read: true })
              .eq("user_id", session.user.id)
              .eq("is_read", false);
            qc.invalidateQueries({ queryKey: ["all-notifications", session.user.id] });
            qc.invalidateQueries({ queryKey: ["notifications", session.user.id] });
          }}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <BellOff className="h-8 w-8" />
            <p className="text-sm">Bạn chưa có thông báo nào.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-1">
          {data.map((n) => (
            <li key={n.id}>
              <Card
                className="cursor-pointer transition-colors hover:bg-accent/40"
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
