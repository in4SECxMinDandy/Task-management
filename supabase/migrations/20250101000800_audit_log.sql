-- ============================================================================
-- admin_audit_log: tamper-resistant audit trail for sensitive admin actions.
--
-- Written exclusively by the `admin-users` Edge Function (service role).
-- Anon/authenticated clients cannot insert directly because RLS is enabled
-- with no INSERT/UPDATE/DELETE policy. Admins can read.
-- ============================================================================

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_id   uuid references public.profiles(id) on delete set null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log(actor_id);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log(target_id);
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit_log_admin_select" on public.admin_audit_log;
create policy "audit_log_admin_select"
  on public.admin_audit_log for select
  using (public.is_admin());
