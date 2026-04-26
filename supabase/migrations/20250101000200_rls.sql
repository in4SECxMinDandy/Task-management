-- ============================================================================
-- Row Level Security policies
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_history enable row level security;
alter table public.notifications enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_self_or_admin_select" on public.profiles;
create policy "profiles_self_or_admin_select"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_self_update_basic" on public.profiles;
create policy "profiles_self_update_basic"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
drop policy if exists "tasks_select_assignee_or_admin" on public.tasks;
create policy "tasks_select_assignee_or_admin"
  on public.tasks for select
  using (assigned_to = auth.uid() or created_by = auth.uid() or public.is_admin());

drop policy if exists "tasks_admin_insert" on public.tasks;
create policy "tasks_admin_insert"
  on public.tasks for insert
  with check (public.is_admin());

drop policy if exists "tasks_assignee_update" on public.tasks;
create policy "tasks_assignee_update"
  on public.tasks for update
  using (assigned_to = auth.uid() and not public.is_admin())
  with check (
    assigned_to = auth.uid()
    -- assignees can change progress / status (but not change the assignee, deadline, etc.)
  );

drop policy if exists "tasks_admin_update" on public.tasks;
create policy "tasks_admin_update"
  on public.tasks for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tasks_admin_delete" on public.tasks;
create policy "tasks_admin_delete"
  on public.tasks for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- task_attachments
-- ----------------------------------------------------------------------------
drop policy if exists "attachments_select" on public.task_attachments;
create policy "attachments_select"
  on public.task_attachments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
    )
  );

drop policy if exists "attachments_insert_assignee_submission" on public.task_attachments;
create policy "attachments_insert_assignee_submission"
  on public.task_attachments for insert
  with check (
    (
      kind = 'submission'
      and exists (
        select 1 from public.tasks t
        where t.id = task_id and t.assigned_to = auth.uid()
      )
    )
    or public.is_admin()
  );

drop policy if exists "attachments_admin_delete" on public.task_attachments;
create policy "attachments_admin_delete"
  on public.task_attachments for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- task_comments
-- ----------------------------------------------------------------------------
drop policy if exists "comments_select" on public.task_comments;
create policy "comments_select"
  on public.task_comments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
    )
  );

drop policy if exists "comments_insert_participants" on public.task_comments;
create policy "comments_insert_participants"
  on public.task_comments for insert
  with check (
    user_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.tasks t
        where t.id = task_id
          and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
      )
    )
  );

-- ----------------------------------------------------------------------------
-- task_history (read only for users; written by triggers)
-- ----------------------------------------------------------------------------
drop policy if exists "history_select" on public.task_history;
create policy "history_select"
  on public.task_history for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- notifications: user can read/update own; triggers insert
-- ----------------------------------------------------------------------------
drop policy if exists "notifications_self_select" on public.notifications;
create policy "notifications_self_select"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_self_update" on public.notifications;
create policy "notifications_self_update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
