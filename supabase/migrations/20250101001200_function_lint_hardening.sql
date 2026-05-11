-- ============================================================================
-- Supabase linter hardening for function search_path and executable privileges.
-- ============================================================================

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.set_updated_at() set search_path = public;
alter function public.task_file_task_id(text) set search_path = public;

create or replace function public.clear_must_change_password()
returns void
language plpgsql
security invoker
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

revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;

create or replace function private.is_role(target_role public.app_role)
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

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_role('admin');
$$;

create or replace function private.is_task_assignee(p_task_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_assignees
    where task_id = p_task_id and user_id = p_user_id
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

grant execute on function private.is_role(public.app_role) to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_task_assignee(uuid, uuid) to anon, authenticated, service_role;
grant execute on function private.is_active_user() to anon, authenticated, service_role;

drop policy if exists "profiles_self_or_admin_select" on public.profiles;
create policy "profiles_self_or_admin_select"
  on public.profiles for select
  using (auth.uid() = id or private.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "tasks_admin_insert" on public.tasks;
create policy "tasks_admin_insert"
  on public.tasks for insert
  with check (private.is_admin());

drop policy if exists "tasks_admin_update" on public.tasks;
create policy "tasks_admin_update"
  on public.tasks for update
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "tasks_admin_delete" on public.tasks;
create policy "tasks_admin_delete"
  on public.tasks for delete
  using (private.is_admin());

drop policy if exists "task_assignees_select" on public.task_assignees;
create policy "task_assignees_select"
  on public.task_assignees for select
  using (
    private.is_admin()
    or (
      private.is_active_user()
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.tasks t
          where t.id = task_id
            and (t.created_by = auth.uid() or private.is_task_assignee(t.id, auth.uid()))
        )
      )
    )
  );

drop policy if exists "task_assignees_admin_all" on public.task_assignees;
create policy "task_assignees_admin_all"
  on public.task_assignees for all
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "tasks_select_assignee_or_admin" on public.tasks;
create policy "tasks_select_assignee_or_admin"
  on public.tasks for select
  using (
    private.is_admin()
    or (
      private.is_active_user()
      and (
        assigned_to = auth.uid()
        or created_by = auth.uid()
        or private.is_task_assignee(id, auth.uid())
      )
    )
  );

drop policy if exists "tasks_assignee_update" on public.tasks;
create policy "tasks_assignee_update"
  on public.tasks for update
  using (
    not private.is_admin()
    and private.is_active_user()
    and (assigned_to = auth.uid() or private.is_task_assignee(id, auth.uid()))
  )
  with check (
    private.is_active_user()
    and (assigned_to = auth.uid() or private.is_task_assignee(id, auth.uid()))
  );

drop policy if exists "attachments_select" on public.task_attachments;
create policy "attachments_select"
  on public.task_attachments for select
  using (
    private.is_admin()
    or (
      private.is_active_user()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or private.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "attachments_insert_assignee_submission" on public.task_attachments;
create policy "attachments_insert_assignee_submission"
  on public.task_attachments for insert
  with check (
    private.is_admin()
    or (
      private.is_active_user()
      and kind = 'submission'
      and (
        exists (
          select 1 from public.tasks t
          where t.id = task_id and t.assigned_to = auth.uid()
        )
        or private.is_task_assignee(task_id, auth.uid())
      )
    )
  );

drop policy if exists "attachments_admin_delete" on public.task_attachments;
create policy "attachments_admin_delete"
  on public.task_attachments for delete
  using (private.is_admin());

drop policy if exists "comments_select" on public.task_comments;
create policy "comments_select"
  on public.task_comments for select
  using (
    private.is_admin()
    or (
      private.is_active_user()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or private.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "comments_insert_participants" on public.task_comments;
create policy "comments_insert_participants"
  on public.task_comments for insert
  with check (
    user_id = auth.uid()
    and private.is_active_user()
    and (
      private.is_admin()
      or exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or private.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "history_select" on public.task_history;
create policy "history_select"
  on public.task_history for select
  using (
    private.is_admin()
    or (
      private.is_active_user()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or private.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "audit_log_admin_select" on public.admin_audit_log;
create policy "audit_log_admin_select"
  on public.admin_audit_log for select
  using (private.is_admin());

drop policy if exists "task_files_select" on storage.objects;
create policy "task_files_select"
  on storage.objects for select
  using (
    bucket_id = 'task-files'
    and (
      private.is_admin()
      or (
        private.is_active_user()
        and exists (
          select 1 from public.tasks t
          where t.id = public.task_file_task_id(storage.objects.name)
            and (
              t.assigned_to = auth.uid()
              or t.created_by = auth.uid()
              or private.is_task_assignee(t.id, auth.uid())
            )
        )
      )
    )
  );

drop policy if exists "task_files_insert_admin" on storage.objects;
create policy "task_files_insert_admin"
  on storage.objects for insert
  with check (bucket_id = 'task-files' and private.is_admin());

drop policy if exists "task_files_insert_assignee_submission" on storage.objects;
create policy "task_files_insert_assignee_submission"
  on storage.objects for insert
  with check (
    bucket_id = 'task-files'
    and private.is_active_user()
    and split_part(storage.objects.name, '/', 2) = 'submission'
    and (
      exists (
        select 1 from public.tasks t
        where t.id = public.task_file_task_id(storage.objects.name)
          and t.assigned_to = auth.uid()
      )
      or private.is_task_assignee(
        public.task_file_task_id(storage.objects.name),
        auth.uid()
      )
    )
  );

drop policy if exists "task_files_delete_admin" on storage.objects;
create policy "task_files_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'task-files' and private.is_admin());

create or replace function public.profiles_block_privileged_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or private.is_admin() then
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

create or replace function public.tasks_enforce_assignee_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or private.is_admin() then
    return new;
  end if;

  if not (
    (old.assigned_to is not null and old.assigned_to = auth.uid())
    or private.is_task_assignee(old.id, auth.uid())
  ) then
    raise exception 'Permission denied: only an assignee can update this task'
      using errcode = '42501';
  end if;

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

revoke all on function public.is_role(public.app_role) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_task_assignee(uuid, uuid) from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon, authenticated;
revoke all on function public.notify_task_assigned() from public, anon, authenticated;
revoke all on function public.notify_task_assignee_added() from public, anon, authenticated;
revoke all on function public.notify_task_updated() from public, anon, authenticated;
revoke all on function public.notify_task_commented() from public, anon, authenticated;
revoke all on function public.profiles_block_privileged_self_update() from public, anon, authenticated;
revoke all on function public.tasks_enforce_assignee_update_rules() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
