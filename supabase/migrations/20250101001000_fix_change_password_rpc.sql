-- ============================================================================
-- Fix: allow authenticated users to clear their own must_change_password flag
--      after a successful password change.
--
-- Problem: the `profiles_block_privileged_self_update` trigger (migration 0700)
-- prevents non-admin users from setting `must_change_password = false` via the
-- anon-key client, causing ChangePasswordPage to always throw an error and
-- leave the flag set to true (redirect loop).
--
-- Solution: a `security definer` RPC that runs as the function owner (postgres)
-- and is therefore exempt from the trigger's privilege check. It only clears
-- the flag for the currently authenticated user — no privilege escalation is
-- possible.
-- ============================================================================

create or replace function public.clear_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for unauthenticated callers; bail out safely.
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  update public.profiles
     set must_change_password = false
   where id = auth.uid();
end;
$$;

-- Grant execute to authenticated users only (not anon).
revoke all on function public.clear_must_change_password() from public;
grant execute on function public.clear_must_change_password() to authenticated;
