-- ============================================================================
-- Storage bucket + policies for task files.
-- Run this AFTER the previous migrations.
-- ============================================================================

-- Create the bucket if it doesn't already exist.
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false)
on conflict (id) do nothing;

-- Helper: parse the task_id (first folder segment) from the storage object name.
create or replace function public.task_file_task_id(name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    then split_part(name, '/', 1)::uuid
    else null
  end;
$$;

-- ---------- SELECT (download / list) ----------
drop policy if exists "task_files_select" on storage.objects;
create policy "task_files_select"
  on storage.objects for select
  using (
    bucket_id = 'task-files'
    and (
      public.is_admin()
      or exists (
        select 1 from public.tasks t
        where t.id = public.task_file_task_id(storage.objects.name)
          and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
      )
    )
  );

-- ---------- INSERT (upload) ----------
-- Admins can upload any file (assignment files).
-- Assignees can upload submission files for their tasks.
drop policy if exists "task_files_insert_admin" on storage.objects;
create policy "task_files_insert_admin"
  on storage.objects for insert
  with check (bucket_id = 'task-files' and public.is_admin());

drop policy if exists "task_files_insert_assignee_submission" on storage.objects;
create policy "task_files_insert_assignee_submission"
  on storage.objects for insert
  with check (
    bucket_id = 'task-files'
    and split_part(storage.objects.name, '/', 2) = 'submission'
    and exists (
      select 1 from public.tasks t
      where t.id = public.task_file_task_id(storage.objects.name)
        and t.assigned_to = auth.uid()
    )
  );

-- ---------- DELETE (admin only) ----------
drop policy if exists "task_files_delete_admin" on storage.objects;
create policy "task_files_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'task-files' and public.is_admin());
