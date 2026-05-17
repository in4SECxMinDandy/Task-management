import { useEffect, useState } from "react";
import { Download, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Update } from "@tauri-apps/plugin-updater";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  checkForUpdate,
  downloadAndInstall,
  formatBytes,
  getAppVersion,
  isTauriRuntime,
  relaunchApp,
} from "@/lib/version";

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "no-update" }
  | { kind: "available"; update: Update }
  | { kind: "downloading"; update: Update; received: number; total: number }
  | { kind: "installed" }
  | { kind: "error"; message: string };

export function UpdateButton() {
  const [currentVersion, setCurrentVersion] = useState<string>("…");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const inTauri = isTauriRuntime();

  useEffect(() => {
    let active = true;
    getAppVersion()
      .then((v) => {
        if (active) setCurrentVersion(v);
      })
      .catch(() => {
        if (active) setCurrentVersion("0.0.0");
      });
    return () => {
      active = false;
    };
  }, []);

  const onCheck = async () => {
    if (!inTauri) {
      toast.info("Cập nhật chỉ hoạt động khi chạy ứng dụng Desktop.");
      return;
    }
    setPhase({ kind: "checking" });
    setDialogOpen(true);
    try {
      const update = await checkForUpdate();
      if (!update) {
        setPhase({ kind: "no-update" });
        return;
      }
      setPhase({ kind: "available", update });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ kind: "error", message });
    }
  };

  const onInstall = async () => {
    if (phase.kind !== "available") return;
    const update = phase.update;
    setPhase({ kind: "downloading", update, received: 0, total: 0 });
    try {
      await downloadAndInstall(update, (received, total) => {
        setPhase({ kind: "downloading", update, received, total });
      });
      setPhase({ kind: "installed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ kind: "error", message });
    }
  };

  const onRelaunch = async () => {
    try {
      await relaunchApp();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Không thể khởi động lại: ${message}`);
    }
  };

  const closeDialog = () => {
    if (phase.kind === "downloading") return; // không cho đóng giữa chừng
    setDialogOpen(false);
    // Reset về idle sau khi animation đóng kết thúc
    setTimeout(() => setPhase({ kind: "idle" }), 200);
  };

  const isBusy = phase.kind === "checking" || phase.kind === "downloading";

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Phiên bản hiện tại</div>
          <div className="text-xs text-muted-foreground">
            v{currentVersion}
            {!inTauri && " · Tính năng cập nhật chỉ khả dụng trên ứng dụng Desktop"}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCheck}
          disabled={isBusy || !inTauri}
          className="gap-2"
        >
          {isBusy ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Kiểm tra cập nhật
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent
          // Chặn đóng khi đang tải
          onInteractOutside={(e) => {
            if (phase.kind === "downloading") e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (phase.kind === "downloading") e.preventDefault();
          }}
        >
          <UpdateDialogBody
            phase={phase}
            currentVersion={currentVersion}
            onInstall={onInstall}
            onRelaunch={onRelaunch}
            onClose={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function UpdateDialogBody({
  phase,
  currentVersion,
  onInstall,
  onRelaunch,
  onClose,
}: {
  phase: Phase;
  currentVersion: string;
  onInstall: () => void;
  onRelaunch: () => void;
  onClose: () => void;
}) {
  if (phase.kind === "checking") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Đang kiểm tra cập nhật…
          </DialogTitle>
          <DialogDescription>
            Đang liên hệ máy chủ để xem có phiên bản mới hơn v{currentVersion} hay không.
          </DialogDescription>
        </DialogHeader>
      </>
    );
  }

  if (phase.kind === "no-update") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Bạn đang dùng phiên bản mới nhất
          </DialogTitle>
          <DialogDescription>
            Phiên bản hiện tại v{currentVersion} đã là bản mới nhất. Hãy quay lại sau nhé.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </>
    );
  }

  if (phase.kind === "available") {
    const { update } = phase;
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Có bản cập nhật mới: v{update.version}
          </DialogTitle>
          <DialogDescription>
            Phiên bản hiện tại v{currentVersion}. Sau khi tải xong, ứng dụng sẽ tự cài đặt và khởi
            động lại.
          </DialogDescription>
        </DialogHeader>
        {update.body && (
          <div className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {update.body}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Để sau
          </Button>
          <Button onClick={onInstall} className="gap-2">
            <Download className="h-4 w-4" /> Cập nhật ngay
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (phase.kind === "downloading") {
    const { update, received, total } = phase;
    const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null;
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 animate-pulse" /> Đang tải v{update.version}…
          </DialogTitle>
          <DialogDescription>
            Vui lòng không tắt ứng dụng. Ứng dụng sẽ tự động cài đặt và khởi động lại sau khi tải
            xong.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Progress value={percent ?? 0} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatBytes(received)}
              {total > 0 && ` / ${formatBytes(total)}`}
            </span>
            <span>{percent !== null ? `${percent}%` : "Đang tải…"}</span>
          </div>
        </div>
      </>
    );
  }

  if (phase.kind === "installed") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Cập nhật hoàn tất
          </DialogTitle>
          <DialogDescription>
            Bản cập nhật đã cài xong. Khởi động lại ứng dụng để áp dụng thay đổi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Để sau
          </Button>
          <Button onClick={onRelaunch}>Khởi động lại ngay</Button>
        </DialogFooter>
      </>
    );
  }

  if (phase.kind === "error") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Không thể cập nhật
          </DialogTitle>
          <DialogDescription className="break-words">{phase.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </>
    );
  }

  // idle (dialog đáng ra không mở khi idle, nhưng vẫn render fallback an toàn)
  return null;
}
