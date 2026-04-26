import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function SettingsPage() {
  const { profile } = useAuth();
  const { theme, toggle } = useTheme();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Mật khẩu tối thiểu 8 ký tự");
    if (pwd !== confirm) return toast.error("Xác nhận không khớp");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setPwd("");
      setConfirm("");
      toast.success("Đã đổi mật khẩu");
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cài đặt</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Họ tên" value={profile?.full_name ?? "—"} />
          <Row label="Email" value={profile?.email ?? "—"} />
          <Row label="Vai trò" value={profile?.role === "admin" ? "Quản trị viên" : "Nhân viên"} />
          <Row label="Phòng ban" value={profile?.department ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giao diện</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Chuyển sang {theme === "dark" ? "Sáng" : "Tối"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onChangePwd}>
            <div className="grid gap-2">
              <Label htmlFor="new-pwd">Mật khẩu mới</Label>
              <Input
                id="new-pwd"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-pwd">Xác nhận</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              Cập nhật
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cần đăng xuất? Bấm vào ảnh đại diện ở trên cùng bên phải. Hoặc{" "}
        <Link to="/notifications" className="underline">xem tất cả thông báo</Link>.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
