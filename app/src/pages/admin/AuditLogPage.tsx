import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import type { AdminAuditLogEntry, Profile } from "@/types/database";

const ACTION_LABEL: Record<string, string> = {
  create_user: "Tạo tài khoản",
  update_user: "Cập nhật tài khoản",
  reset_password: "Đặt lại mật khẩu",
  delete_user: "Vô hiệu hoá tài khoản",
};

const ACTION_VARIANT: Record<string, "info" | "warning" | "destructive" | "secondary"> = {
  create_user: "info",
  update_user: "secondary",
  reset_password: "warning",
  delete_user: "destructive",
};

type EntryWithRefs = AdminAuditLogEntry & {
  actor: Pick<Profile, "id" | "full_name"> | null;
  target: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export function AuditLogPage() {
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select(
          "*, actor:profiles!admin_audit_log_actor_id_fkey(id, full_name), target:profiles!admin_audit_log_target_id_fkey(id, full_name, email)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as EntryWithRefs[];
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      return (
        row.actor?.full_name.toLowerCase().includes(q) ||
        row.target?.full_name?.toLowerCase().includes(q) ||
        row.target?.email?.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        ACTION_LABEL[row.action]?.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký quản trị"
        description="Lịch sử các hành động nhạy cảm trên tài khoản (tạo, sửa, đặt lại mật khẩu, vô hiệu hoá). Hiển thị tối đa 500 mục gần nhất."
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo người thực hiện, đối tượng, hành động..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Thời gian</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      size="inline"
                      icon={ScrollText}
                      title={search ? "Không tìm thấy mục nào" : "Chưa có hoạt động nào được ghi"}
                      description={
                        search
                          ? "Thử với từ khoá khác."
                          : "Các thao tác quản trị sẽ được tự động ghi vào đây."
                      }
                      action={
                        search ? (
                          <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                            Xoá tìm kiếm
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </TableCell>
                    <TableCell>{row.actor?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[row.action] ?? "secondary"}>
                        {ACTION_LABEL[row.action] ?? row.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.target ? (
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {row.target.full_name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {row.target.email}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <pre className="max-w-md overflow-x-auto rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                        {row.payload ? JSON.stringify(row.payload) : "—"}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
