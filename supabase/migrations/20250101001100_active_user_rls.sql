-- ============================================================================
-- Require active accounts for employee data access.
-- ============================================================================

create or replace function public.is_active_user()
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

drop policy if exists "task_assignees_select" on public.task_assignees;
create policy "task_assignees_select"
  on public.task_assignees for select
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.tasks t
          where t.id = task_id
            and (t.created_by = auth.uid() or public.is_task_assignee(t.id, auth.uid()))
        )
      )
    )
  );

drop policy if exists "tasks_select_assignee_or_admin" on public.tasks;
create policy "tasks_select_assignee_or_admin"
  on public.tasks for select
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and (
        assigned_to = auth.uid()
        or created_by = auth.uid()
        or public.is_task_assignee(id, auth.uid())
      )
    )
  );

drop policy if exists "tasks_assignee_update" on public.tasks;
create policy "tasks_assignee_update"
  on public.tasks for update
  using (
    not public.is_admin()
    and public.is_active_user()
    and (assigned_to = auth.uid() or public.is_task_assignee(id, auth.uid()))
  )
  with check (
    public.is_active_user()
    and (assigned_to = auth.uid() or public.is_task_assignee(id, auth.uid()))
  );

drop policy if exists "attachments_select" on public.task_attachments;
create policy "attachments_select"
  on public.task_attachments for select
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or public.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "attachments_insert_assignee_submission" on public.task_attachments;
create policy "attachments_insert_assignee_submission"
  on public.task_attachments for insert
  with check (
    public.is_admin()
    or (
      public.is_active_user()
      and kind = 'submission'
      and (
        exists (
          select 1 from public.tasks t
          where t.id = task_id and t.assigned_to = auth.uid()
        )
        or public.is_task_assignee(task_id, auth.uid())
      )
    )
  );

drop policy if exists "comments_select" on public.task_comments;
create policy "comments_select"
  on public.task_comments for select
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or public.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "comments_insert_participants" on public.task_comments;
create policy "comments_insert_participants"
  on public.task_comments for insert
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and (
      public.is_admin()
      or exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or public.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "history_select" on public.task_history;
create policy "history_select"
  on public.task_history for select
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or public.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "task_files_select" on storage.objects;
create policy "task_files_select"
  on storage.objects for select
  using (
    bucket_id = 'task-files'
    and (
      public.is_admin()
      or (
        public.is_active_user()
        and exists (
          select 1 from public.tasks t
          where t.id = public.task_file_task_id(storage.objects.name)
            and (
              t.assigned_to = auth.uid()
              or t.created_by = auth.uid()
              or public.is_task_assignee(t.id, auth.uid())
            )
        )
      )
    )
  );

drop policy if exists "task_files_insert_assignee_submission" on storage.objects;
create policy "task_files_insert_assignee_submission"
  on storage.objects for insert
  with check (
    bucket_id = 'task-files'
    and public.is_active_user()
    and split_part(storage.objects.name, '/', 2) = 'submission'
    and (
      exists (
        select 1 from public.tasks t
        where t.id = public.task_file_task_id(storage.objects.name)
          and t.assigned_to = auth.uid()
      )
      or public.is_task_assignee(
        public.task_file_task_id(storage.objects.name),
        auth.uid()
      )
    )
  );
