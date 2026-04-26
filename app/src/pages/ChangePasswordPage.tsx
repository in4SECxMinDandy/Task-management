import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function ChangePasswordPage({ forced = false }: { forced?: boolean }) {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForced = forced || profile?.must_change_password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Mật khẩu tối thiểu 8 ký tự");
    if (password !== confirm) return setError("Xác nhận mật khẩu không khớp");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (session?.user.id) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", session.user.id);
        if (pErr) throw pErr;
      }
      await refreshProfile();
      navigate("/", { replace: true });
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{isForced ? "Đổi mật khẩu lần đầu" : "Đổi mật khẩu"}</CardTitle>
          <CardDescription>
            {isForced
              ? "Vì bảo mật, bạn cần đặt mật khẩu mới trước khi sử dụng hệ thống."
              : "Đặt mật khẩu mới cho tài khoản."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cập nhật"}
            </Button>
            {isForced && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={async () => {
                  await signOut();
                  navigate("/login", { replace: true });
                }}
              >
                Đăng xuất
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
