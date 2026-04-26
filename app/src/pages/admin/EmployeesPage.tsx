import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus, RefreshCw, Search, ShieldOff, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { initials, formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
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
import { adminUpdateUser } from "@/lib/admin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function EmployeesPage() {
  const qc = useQueryClient();
  const { profile: me } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [disabling, setDisabling] = useState<Profile | null>(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filtered = data.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.department ?? "").toLowerCase().includes(q)
    );
  });

  const onToggleActive = async (p: Profile) => {
    try {
      await adminUpdateUser({ user_id: p.id, is_active: !p.is_active });
      toast.success(p.is_active ? "Đã vô hiệu hóa tài khoản" : "Đã kích hoạt lại tài khoản");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Có lỗi xảy ra");
    } finally {
      setDisabling(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý nhân viên"
        description="Tạo, chỉnh sửa và quản lý quyền truy cập của nhân viên."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm nhân viên
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tên, email, phòng ban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton rows preview the table layout instead of a generic
                // "loading" string (Design System §2 — micro-interactions).
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      size="inline"
                      icon={Users}
                      title={search ? "Không tìm thấy nhân viên phù hợp" : "Chưa có nhân viên"}
                      description={
                        search
                          ? "Thử với từ khoá khác."
                          : "Thêm nhân viên để bắt đầu giao việc."
                      }
                      action={
                        search ? (
                          <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                            Xoá tìm kiếm
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" /> Thêm nhân viên
                          </Button>
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/employees/${p.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.full_name}</div>
                          <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{p.department ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.role === "admin" ? "info" : "secondary"}>
                        {p.role === "admin" ? "Quản trị" : "Nhân viên"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge variant="success">Hoạt động</Badge>
                      ) : (
                        <Badge variant="destructive">Vô hiệu</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(p)}>
                            <UserCog className="h-4 w-4" /> Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetting(p)}>
                            <RefreshCw className="h-4 w-4" /> Đặt lại mật khẩu
                          </DropdownMenuItem>
                          {p.id !== me?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={p.is_active ? "text-destructive focus:text-destructive" : ""}
                                onClick={() => setDisabling(p)}
                              >
                                <ShieldOff className="h-4 w-4" />
                                {p.is_active ? "Vô hiệu hóa" : "Kích hoạt lại"}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog profile={editing} onOpenChange={(o) => !o && setEditing(null)} />
      <ResetPasswordDialog profile={resetting} onOpenChange={(o) => !o && setResetting(null)} />

      <AlertDialog open={!!disabling} onOpenChange={(o) => !o && setDisabling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disabling?.is_active ? "Vô hiệu hóa tài khoản?" : "Kích hoạt lại tài khoản?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disabling?.is_active
                ? `Tài khoản ${disabling?.full_name} sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`
                : `Tài khoản ${disabling?.full_name} sẽ có thể đăng nhập trở lại.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => disabling && onToggleActive(disabling)}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
