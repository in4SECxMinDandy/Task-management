import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, RefreshCw } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminCreateUser, generatePassword } from "@/lib/admin";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [password, setPassword] = useState(() => generatePassword());
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const reset = () => {
    setEmail("");
    setFullName("");
    setDepartment("");
    setRole("employee");
    setPassword(generatePassword());
    setCreated(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminCreateUser({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        password,
        role,
        department: department.trim() || null,
      });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["employee-performance"] });
      setCreated({ email: email.trim().toLowerCase(), password });
      toast.success("Đã tạo tài khoản");
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Tạo tài khoản thất bại. Kiểm tra Edge Function admin-users.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>
            Tạo tài khoản mới. Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted p-4 text-sm">
              <p className="mb-2 font-medium">Tài khoản đã được tạo:</p>
              <CopyRow label="Email" value={created.email} />
              <CopyRow label="Mật khẩu" value={created.password} />
              <p className="mt-3 text-xs text-muted-foreground">
                Hãy gửi thông tin này cho nhân viên qua kênh an toàn. Nhân viên sẽ phải đổi mật khẩu khi đăng nhập lần đầu.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Tạo thêm
              </Button>
              <Button onClick={() => onOpenChange(false)}>Xong</Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Họ tên</Label>
              <Input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="department">Phòng ban</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vai trò</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "admin" | "employee")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Nhân viên</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu khởi tạo</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPassword(generatePassword())}
                  aria-label="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="rounded bg-background px-2 py-0.5 text-xs">{value}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Đã sao chép");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
