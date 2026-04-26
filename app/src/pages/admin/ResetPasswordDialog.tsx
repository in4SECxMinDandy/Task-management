import { useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminResetPassword, generatePassword } from "@/lib/admin";
import type { Profile } from "@/types/database";

interface Props {
  profile: Profile | null;
  onOpenChange: (o: boolean) => void;
}

export function ResetPasswordDialog({ profile, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [password, setPassword] = useState(generatePassword());
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setPassword(generatePassword());
      setDone(false);
    }
  }, [profile]);

  if (!profile) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminResetPassword(profile.id, password);
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
      setDone(true);
      toast.success("Đã đặt lại mật khẩu");
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>
            Mật khẩu mới sẽ được áp dụng ngay. Nhân viên cần đổi mật khẩu khi đăng nhập lần kế tiếp.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-pwd">Mật khẩu mới</Label>
            <div className="flex gap-2">
              <Input
                id="new-pwd"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={done}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                disabled={done}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(password);
                  toast.success("Đã sao chép");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {done ? "Đóng" : "Hủy"}
            </Button>
            {!done && (
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đặt lại"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
