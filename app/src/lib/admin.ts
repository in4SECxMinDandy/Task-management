import { supabase } from "./supabase";

interface CreateUserPayload {
  email: string;
  full_name: string;
  password: string;
  role: "admin" | "employee";
  department?: string | null;
}

interface UpdateUserPayload {
  user_id: string;
  full_name?: string;
  role?: "admin" | "employee";
  department?: string | null;
  is_active?: boolean;
}

export async function adminCreateUser(payload: CreateUserPayload) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "create", ...payload },
  });
  if (error) throw error;
  return data as { user_id: string };
}

export async function adminUpdateUser(payload: UpdateUserPayload) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "update", ...payload },
  });
  if (error) throw error;
  return data;
}

export async function adminResetPassword(user_id: string, new_password: string) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "reset_password", user_id, new_password },
  });
  if (error) throw error;
  return data;
}

export async function adminDeleteUser(user_id: string) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "delete", user_id },
  });
  if (error) throw error;
  return data;
}

export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}
