import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * True when the React bundle is running inside the Tauri webview (i.e., the
 * desktop app), false when running in a plain browser via `pnpm dev`.
 *
 * The updater / process plugins crash if invoked outside of Tauri, so this
 * guard lets us disable the OTA button gracefully during web-only development.
 */
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  // Tauri 2 exposes this internal symbol on `window` only inside the webview.
  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

/**
 * Reads the current app version from `tauri.conf.json` at runtime via the
 * Tauri API. Falls back to `import.meta.env.VITE_APP_VERSION` (for browser
 * dev) and finally to "0.0.0" so the UI always has something to display.
 */
export async function getAppVersion(): Promise<string> {
  if (isTauriRuntime()) {
    try {
      return await getVersion();
    } catch {
      // fall through to env-based fallback below
    }
  }
  const envVersion = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_APP_VERSION;
  return envVersion ?? "0.0.0";
}

/**
 * Asks the configured updater endpoint(s) whether a newer version exists.
 * Returns `null` when:
 *   - we're not in Tauri (browser dev mode),
 *   - the endpoint reports no update (HTTP 204 or matching version),
 *   - or any non-fatal error happened during the check.
 *
 * Throws only on signature/configuration problems the user should know about.
 */
export async function checkForUpdate(): Promise<Update | null> {
  if (!isTauriRuntime()) return null;
  const update = await check();
  return update ?? null;
}

/**
 * Downloads and installs an update bundle, reporting byte-level progress
 * through `onProgress(received, total)`. `total` may be 0 if the server
 * didn't send a Content-Length header.
 *
 * On Windows the installer (NSIS) is run automatically in passive mode and
 * the app is killed by Tauri before reinstall. We still call `relaunch()`
 * afterwards so other platforms restart cleanly.
 */
export async function downloadAndInstall(
  update: Update,
  onProgress: (received: number, total: number) => void,
): Promise<void> {
  let received = 0;
  let total = 0;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        received = 0;
        onProgress(received, total);
        break;
      case "Progress":
        received += event.data.chunkLength;
        onProgress(received, total);
        break;
      case "Finished":
        onProgress(total || received, total || received);
        break;
    }
  });
}

/**
 * Restarts the desktop app after an update has been installed.
 * Safe to call only inside Tauri.
 */
export async function relaunchApp(): Promise<void> {
  if (!isTauriRuntime()) return;
  await relaunch();
}

/** Format byte counts for the progress UI (e.g. 12.3 MB). */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
