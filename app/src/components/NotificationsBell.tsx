import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/types/database";
import { formatRelative } from "@/lib/utils";
import { sendDesktopNotification } from "@/lib/notify";

export function NotificationsBell() {
  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["notifications", session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
  });

  const unreadCount = data.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase
      .channel(`notif-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          qc.invalidateQueries({ queryKey: ["notifications", session.user.id] });
          qc.invalidateQueries({ queryKey: ["my-tasks"] });
          qc.invalidateQueries({ queryKey: ["tasks"] });
          sendDesktopNotification("Thông báo mới", n.message);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id, qc]);

  const markAllRead = async () => {
    if (!session?.user.id) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications", session.user.id] });
  };

  if (!profile) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-semibold">Thông báo</span>
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            Đánh dấu đã đọc
          </Button>
        </div>
        <ScrollArea className="h-80">
          {data.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Không có thông báo</div>
          ) : (
            <ul className="divide-y">
              {data.map((n) => (
                <li
                  key={n.id}
                  className="cursor-pointer p-3 transition-colors hover:bg-accent"
                  onClick={async () => {
                    if (!n.is_read) {
                      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
                      qc.invalidateQueries({ queryKey: ["notifications", session!.user.id] });
                    }
                    setOpen(false);
                    if (n.task_id) navigate(`/tasks/${n.task_id}`);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-info" />}
                    <div className="flex-1 text-sm">
                      <p className={n.is_read ? "text-muted-foreground" : ""}>{n.message}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
