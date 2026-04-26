import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function InactivePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardContent className="space-y-4 p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Tài khoản đã bị vô hiệu hóa</h1>
          <p className="text-sm text-muted-foreground">
            Vui lòng liên hệ với quản trị viên để được hỗ trợ.
          </p>
          <Button
            onClick={async () => {
              await signOut();
              navigate("/login", { replace: true });
            }}
          >
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
