import { supabase } from "./supabase";

export const TASK_BUCKET = "task-files";

export async function uploadTaskFile(taskId: string, file: File, kind: "assignment" | "submission") {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${taskId}/${kind}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(TASK_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(TASK_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * `true` when running inside the Tauri desktop webview.
 *
 * Tauri injects `__TAURI_INTERNALS__` on the window object; in plain browser
 * dev (`pnpm dev`) it is absent.
 */
function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>)
  );
}

/**
 * Download a Supabase Storage object to disk.
 *
 * The previous implementation tried to open the file's signed URL in the
 * user's default browser via `@tauri-apps/plugin-opener`. In Tauri v2 the
 * `opener:default` capability does not grant `openUrl` for arbitrary
 * https:// targets, so the click was silently rejected and nothing
 * happened. Instead we now fetch the bytes through the Supabase JS client
 * (which already has the user's session and goes through RLS), then:
 *
 * - In Tauri: ask the OS for a save location via plugin-dialog and write
 *   the bytes with plugin-fs.
 * - In a plain browser: trigger an `<a download>` click on a blob URL.
 *
 * This works without any extra capability, and gives the user a real
 * "Save as" dialog instead of bouncing through a browser tab.
 */
export async function downloadTaskFile(
  storagePath: string,
  fileName: string,
): Promise<void> {
  const { data, error } = await supabase.storage.from(TASK_BUCKET).download(storagePath);
  if (error) throw error;
  if (!data) throw new Error("Không nhận được dữ liệu file");

  if (isTauri()) {
    const [{ save }, { invoke }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/api/core"),
    ]);
    const ext = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
    const target = await save({
      defaultPath: fileName,
      filters: ext
        ? [{ name: ext.toUpperCase(), extensions: [ext] }]
        : undefined,
    });
    if (!target) return; // user cancelled
    const buf = Array.from(new Uint8Array(await data.arrayBuffer()));
    // Custom Tauri command (see src-tauri/src/lib.rs::save_bytes). We use this
    // instead of plugin-fs `writeFile` because the latter rejects paths that
    // aren't whitelisted by the fs scope, which would force us to enumerate
    // every possible save location.
    await invoke("save_bytes", { path: target, bytes: buf });
    return;
  }

  const url = URL.createObjectURL(data);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
