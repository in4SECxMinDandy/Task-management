import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let permissionChecked = false;
let permissionGranted = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionChecked) return permissionGranted;
  permissionChecked = true;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const res = await requestPermission();
      granted = res === "granted";
    }
    permissionGranted = granted;
    return granted;
  } catch {
    permissionGranted = false;
    return false;
  }
}

export async function sendDesktopNotification(title: string, body: string) {
  try {
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    sendNotification({ title, body });
  } catch {
    // ignore (e.g., when running in browser dev mode)
  }
}
