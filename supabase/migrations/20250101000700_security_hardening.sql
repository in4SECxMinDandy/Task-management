-- ============================================================================
-- Security hardening: prevent privilege escalation and self-approval.
--
-- Two BEFORE UPDATE triggers complement the RLS policies:
--
--  1. profiles_block_privileged_self_update — non-admin users may only update
--     a small set of harmless fields (full_name, avatar_url, department).
--     This closes a privilege-escalation hole where an employee could run
--     `update profiles set role='admin' where id = auth.uid()` and the
--     `profiles_self_update_basic` policy would happily accept it.
--
--  2. tasks_enforce_assignee_update_rules — non-admin assignees may only:
--       - update progress / submission_note
--       - move status pending -> in_progress -> submitted (or rejected ->
--         in_progress / submitted when re-submitting)
--     Everything else (title, description, deadline, priority, assigned_to,
--     created_by, review_*) is reserved for admins. This closes a
--     self-approval hole where an assignee could simply set
--     `status='approved'` on their own task.
--
-- Policies remain in place; these triggers are belt-and-braces and are
-- evaluated AFTER RLS allows the row, so admins (is_admin() = true) bypass
-- them entirely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create or replace function public.profiles_block_privileged_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (Edge Functions, server-side jobs) bypasses these checks.
  -- It already requires the secret SUPABASE_SERVICE_ROLE_KEY and is the
  -- intended path for admin-users Edge Function to mutate privileged fields.
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
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

drop trigger if exists profiles_block_privileged_update on public.profiles;
create trigger profiles_block_privileged_update
  before update on public.profiles
  for each row execute procedure public.profiles_block_privileged_self_update();

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
create or replace function public.tasks_enforce_assignee_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;

  -- Only the assignee can land here (RLS already blocked others), but be
  -- defensive: refuse the update outright if it isn't the assignee.
  if old.assigned_to is null or old.assigned_to <> auth.uid() then
    raise exception 'Permission denied: only the assignee can update this task'
      using errcode = '42501';
  end if;

  -- Block changes to admin-only / structural fields.
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.assigned_to is distinct from old.assigned_to
     or new.created_by is distinct from old.created_by
     or new.deadline is distinct from old.deadline
     or new.priority is distinct from old.priority
     or new.review_note is distinct from old.review_note
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'Permission denied: assignee cannot modify task structure or review fields'
      using errcode = '42501';
  end if;

  -- Restrict status transitions. Assignees can only push their work forward;
  -- they cannot approve or reject themselves, and cannot revert back to
  -- "pending" (which would erase the trail).
  if new.status is distinct from old.status then
    if new.status not in ('in_progress', 'submitted') then
      raise exception 'Permission denied: assignee cannot set status to %', new.status
        using errcode = '42501';
    end if;
    if old.status not in ('pending', 'in_progress', 'submitted', 'rejected') then
      raise exception 'Permission denied: invalid status transition from %', old.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_assignee_rules on public.tasks;
create trigger tasks_enforce_assignee_rules
  before update on public.tasks
  for each row execute procedure public.tasks_enforce_assignee_update_rules();
