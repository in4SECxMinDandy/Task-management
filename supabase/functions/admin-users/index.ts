// Supabase Edge Function — admin-users
//
// Provides admin-only operations on auth.users + profiles:
//   - create:          create a new auth user + profile (admin or employee)
//   - update:          update profile fields (full_name, role, department, is_active)
//   - reset_password:  set a new password for an existing user
//   - delete:          soft-delete (set is_active=false) — destructive deletion is
//                      intentionally NOT supported to preserve task history.
//
// Auth: caller MUST be authenticated and have role='admin' in public.profiles.
//
// Deploy:  supabase functions deploy admin-users
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected on deploy)

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...cors, ...(init.headers ?? {}) },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, { status: 405 });
  }

  // ---- Authn / Authz: caller must be an active admin --------------------
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse({ error: "missing_authorization" }, { status: 401 });
  }
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(callerToken);
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "invalid_token" }, { status: 401 });
  }
  const callerId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: profileErr } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", callerId)
    .maybeSingle();
  if (profileErr) {
    return jsonResponse({ error: "profile_lookup_failed", detail: profileErr.message }, { status: 500 });
  }
  if (!callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
    return jsonResponse({ error: "forbidden_admin_only" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, { status: 400 });
  }

  const action = String(body?.action ?? "").trim();

  try {
    switch (action) {
      case "create": {
        const { email, password, full_name, role, department } = body as {
          email: string;
          password: string;
          full_name: string;
          role: "admin" | "employee";
          department?: string | null;
        };
        if (!email || !password || !full_name) {
          return jsonResponse({ error: "missing_required_fields" }, { status: 400 });
        }
        if (role !== "admin" && role !== "employee") {
          return jsonResponse({ error: "invalid_role" }, { status: 400 });
        }
        if (password.length < 8) {
          return jsonResponse({ error: "password_too_short" }, { status: 400 });
        }
        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (error) {
          return jsonResponse({ error: "create_user_failed", detail: error.message }, { status: 400 });
        }
        const { error: insErr } = await admin.from("profiles").upsert({
          id: created.user!.id,
          email,
          full_name,
          role,
          department: department ?? null,
          is_active: true,
          must_change_password: true,
        });
        if (insErr) {
          return jsonResponse({ error: "create_profile_failed", detail: insErr.message }, { status: 500 });
        }
        return jsonResponse({ user_id: created.user!.id });
      }

      case "update": {
        const { user_id, full_name, role, department, is_active } = body as {
          user_id: string;
          full_name?: string;
          role?: "admin" | "employee";
          department?: string | null;
          is_active?: boolean;
        };
        if (!user_id) {
          return jsonResponse({ error: "missing_user_id" }, { status: 400 });
        }
        const update: Record<string, unknown> = {};
        if (full_name !== undefined) update.full_name = full_name;
        if (role !== undefined) {
          if (role !== "admin" && role !== "employee") {
            return jsonResponse({ error: "invalid_role" }, { status: 400 });
          }
          update.role = role;
        }
        if (department !== undefined) update.department = department;
        if (is_active !== undefined) update.is_active = is_active;
        if (Object.keys(update).length === 0) {
          return jsonResponse({ error: "nothing_to_update" }, { status: 400 });
        }
        const { error } = await admin.from("profiles").update(update).eq("id", user_id);
        if (error) {
          return jsonResponse({ error: "update_failed", detail: error.message }, { status: 500 });
        }
        // If deactivating, also disable login by signing out the user globally.
        if (is_active === false) {
          await admin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
        } else if (is_active === true) {
          await admin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
        }
        return jsonResponse({ ok: true });
      }

      case "reset_password": {
        const { user_id, new_password } = body as { user_id: string; new_password: string };
        if (!user_id || !new_password) {
          return jsonResponse({ error: "missing_required_fields" }, { status: 400 });
        }
        if (new_password.length < 8) {
          return jsonResponse({ error: "password_too_short" }, { status: 400 });
        }
        const { error } = await admin.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) {
          return jsonResponse({ error: "reset_failed", detail: error.message }, { status: 500 });
        }
        await admin.from("profiles").update({ must_change_password: true }).eq("id", user_id);
        return jsonResponse({ ok: true });
      }

      case "delete": {
        // Soft delete: keep history but disable login.
        const { user_id } = body as { user_id: string };
        if (!user_id) return jsonResponse({ error: "missing_user_id" }, { status: 400 });
        await admin.from("profiles").update({ is_active: false }).eq("id", user_id);
        await admin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
        return jsonResponse({ ok: true });
      }

      default:
        return jsonResponse({ error: "unknown_action" }, { status: 400 });
    }
  } catch (err) {
    return jsonResponse({ error: "internal_error", detail: String(err) }, { status: 500 });
  }
});
