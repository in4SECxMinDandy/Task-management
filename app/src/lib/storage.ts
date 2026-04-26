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
