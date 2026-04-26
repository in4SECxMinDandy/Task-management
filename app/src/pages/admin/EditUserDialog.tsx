import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminUpdateUser } from "@/lib/admin";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/types/database";

interface Props {
  profile: Profile | null;
  onOpenChange: (o: boolean) => void;
}

export function EditUserDialog({ profile, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { profile: me } = useAuth();
  const isSelf = !!profile && profile.id === me?.id;
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setDepartment(profile.department ?? "");
      setRole(profile.role);
    }
  }, [profile]);

  if (!profile) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminUpdateUser({
        user_id: profile.id,
        full_name: fullName.trim(),
        department: department.trim() || null,
        role,
      });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["employee-performance"] });
      toast.success("Đã cập nhật");
      onOpenChange(false);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa nhân viên</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-fullname">Họ tên</Label>
            <Input id="edit-fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Phòng ban</Label>
              <Input
                id="edit-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Vai trò</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "admin" | "employee")}
                disabled={isSelf}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Nhân viên</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  Không thể tự đổi vai trò của chính mình.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
