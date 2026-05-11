-- ============================================================================
-- Fix: allow authenticated users to clear their own must_change_password flag
--      after a successful password change.
--
-- Problem: the `profiles_block_privileged_self_update` trigger (migration 0700)
-- prevents non-admin users from setting `must_change_password = false` via the
-- anon-key client, causing ChangePasswordPage to always throw an error and
-- leave the flag set to true (redirect loop).
--
-- Solution: a `security definer` RPC that sets a transaction-local bypass flag.
-- The profile trigger only honors that flag for the current user's own
-- must_change_password true -> false transition.
-- ============================================================================

create or replace function public.clear_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  perform set_config('app.allow_clear_must_change_password', 'true', true);

  update public.profiles
     set must_change_password = false
   where id = auth.uid();
end;
$$;

-- Grant execute to authenticated users only (not anon).
revoke all on function public.clear_must_change_password() from public;
grant execute on function public.clear_must_change_password() to authenticated;

create or replace function public.profiles_block_privileged_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;

  if current_setting('app.allow_clear_must_change_password', true) = 'true'
     and auth.uid() is not null
     and old.id = auth.uid()
     and new.id is not distinct from old.id
     and new.email is not distinct from old.email
     and new.role is not distinct from old.role
     and new.is_active is not distinct from old.is_active
     and old.must_change_password = true
     and new.must_change_password = false then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.must_change_password is distinct from old.must_change_password then
    raise exception 'Permission denied: cannot modify privileged profile fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
