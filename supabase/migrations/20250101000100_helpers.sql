-- ============================================================================
-- Helper functions for RLS and notifications
-- ============================================================================

-- Returns true if the current authenticated user has the given role.
create or replace function public.is_role(target_role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target_role and is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_role('admin');
$$;
