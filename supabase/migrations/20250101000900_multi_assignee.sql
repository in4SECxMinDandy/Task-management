-- ============================================================================
-- Multi-assignee support for tasks.
--
-- Introduces a join table `task_assignees(task_id, user_id)` so that one task
-- can be shared between several employees. The original `tasks.assigned_to`
-- column is kept as a "primary assignee" pointer (set to the first chosen
-- employee at creation time) for backward compatibility with views and code
-- paths that haven't been migrated yet, but `task_assignees` is the source of
-- truth for "who is allowed to work on this task".
--
-- Run this migration AFTER 20250101000800_audit_log.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table + indexes
-- ----------------------------------------------------------------------------
create table if not exists public.task_assignees (
  task_id      uuid not null references public.tasks(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references public.profiles(id) on delete set null,
  primary key (task_id, user_id)
);

create index if not exists task_assignees_user_idx
  on public.task_assignees(user_id);
create index if not exists task_assignees_task_idx
  on public.task_assignees(task_id);

-- Backfill from existing single-assignee column so legacy tasks keep working.
insert into public.task_assignees (task_id, user_id, assigned_by)
select t.id, t.assigned_to, t.created_by
from public.tasks t
where t.assigned_to is not null
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 2. Helper function (security definer to avoid recursive RLS lookups)
-- ----------------------------------------------------------------------------
create or replace function public.is_task_assignee(p_task_id uuid, p_user_id uuid)
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

-- ----------------------------------------------------------------------------
-- 3. RLS on task_assignees itself
-- ----------------------------------------------------------------------------
alter table public.task_assignees enable row level security;

drop policy if exists "task_assignees_select" on public.task_assignees;
create policy "task_assignees_select"
  on public.task_assignees for select
  using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.created_by = auth.uid() or public.is_task_assignee(t.id, auth.uid()))
    )
  );

drop policy if exists "task_assignees_admin_all" on public.task_assignees;
create policy "task_assignees_admin_all"
  on public.task_assignees for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Update RLS on tasks / attachments / comments / history to honour
--    task_assignees in addition to the legacy assigned_to column.
-- ----------------------------------------------------------------------------
drop policy if exists "tasks_select_assignee_or_admin" on public.tasks;
create policy "tasks_select_assignee_or_admin"
  on public.tasks for select
  using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
    or public.is_task_assignee(id, auth.uid())
  );

drop policy if exists "tasks_assignee_update" on public.tasks;
create policy "tasks_assignee_update"
  on public.tasks for update
  using (
    not public.is_admin()
    and (assigned_to = auth.uid() or public.is_task_assignee(id, auth.uid()))
  )
  with check (
    assigned_to = auth.uid() or public.is_task_assignee(id, auth.uid())
  );

drop policy if exists "attachments_select" on public.task_attachments;
create policy "attachments_select"
  on public.task_attachments for select
  using (
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
  );

drop policy if exists "attachments_insert_assignee_submission" on public.task_attachments;
create policy "attachments_insert_assignee_submission"
  on public.task_attachments for insert
  with check (
    public.is_admin()
    or (
      kind = 'submission'
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
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_to = auth.uid()
          or t.created_by = auth.uid()
          or public.is_task_assignee(t.id, auth.uid())
        )
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
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.assigned_to = auth.uid()
          or t.created_by = auth.uid()
          or public.is_task_assignee(t.id, auth.uid())
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Storage bucket policies
-- ----------------------------------------------------------------------------
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
          and (
            t.assigned_to = auth.uid()
            or t.created_by = auth.uid()
            or public.is_task_assignee(t.id, auth.uid())
          )
      )
    )
  );

drop policy if exists "task_files_insert_assignee_submission" on storage.objects;
create policy "task_files_insert_assignee_submission"
  on storage.objects for insert
  with check (
    bucket_id = 'task-files'
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

-- ----------------------------------------------------------------------------
-- 6. Replace the security-hardening trigger so any assignee (not just the
--    legacy primary) may push their work forward. The structural / review /
--    self-approval blocks remain in place.
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

  -- Only an assignee (legacy primary OR a task_assignees row) may land here.
  if not (
    (old.assigned_to is not null and old.assigned_to = auth.uid())
    or public.is_task_assignee(old.id, auth.uid())
  ) then
    raise exception 'Permission denied: only an assignee can update this task'
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

-- ----------------------------------------------------------------------------
-- 7. Notification triggers
-- ----------------------------------------------------------------------------

-- 7a. New row in task_assignees -> notify that user.
create or replace function public.notify_task_assignee_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t_title text;
begin
  select title into t_title from public.tasks where id = new.task_id;
  if t_title is null then
    return new;
  end if;
  insert into public.notifications (user_id, task_id, type, message)
  values (
    new.user_id,
    new.task_id,
    'task_assigned',
    'Bạn được giao công việc: ' || t_title
  );
  insert into public.task_history (task_id, by_user, action, note)
  values (
    new.task_id,
    coalesce(new.assigned_by, auth.uid()),
    'assignee_added',
    'user_id=' || new.user_id::text
  );
  return new;
end;
$$;

drop trigger if exists task_assignees_after_insert on public.task_assignees;
create trigger task_assignees_after_insert
  after insert on public.task_assignees
  for each row execute procedure public.notify_task_assignee_added();

-- 7b. Avoid double-notifying the primary assignee on task creation now that
--     task_assignees handles it. Keep the history "created" entry.
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_history (task_id, by_user, action, to_status)
  values (new.id, new.created_by, 'created', new.status);
  return new;
end;
$$;

-- 7c. On task status change, fan out approve/reject notifications to every
--     assignee (legacy primary + task_assignees rows).
create or replace function public.notify_task_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  recipient uuid;
  msg text;
  ntype notification_type;
begin
  if new.status is distinct from old.status then
    insert into public.task_history (task_id, by_user, action, from_status, to_status, note)
    values (new.id, actor, 'status_changed', old.status, new.status, new.review_note);

    if new.status = 'submitted' and new.created_by is not null then
      insert into public.notifications (user_id, task_id, type, message)
      values (new.created_by, new.id, 'task_submitted',
              'Nhân viên đã nộp công việc: ' || new.title);
    elsif new.status in ('approved', 'rejected') then
      if new.status = 'approved' then
        ntype := 'task_approved';
        msg := 'Công việc của bạn đã được duyệt: ' || new.title;
      else
        ntype := 'task_rejected';
        msg := 'Công việc của bạn cần chỉnh sửa: ' || new.title;
      end if;

      for recipient in
        select distinct uid from (
          select user_id as uid from public.task_assignees where task_id = new.id
          union
          select new.assigned_to as uid
        ) s
        where uid is not null
      loop
        insert into public.notifications (user_id, task_id, type, message)
        values (recipient, new.id, ntype, msg);
      end loop;
    end if;
  end if;

  -- Reassigning the legacy primary slot still produces a notification (in
  -- addition to the task_assignees trigger above, which fires when admins add
  -- new assignees through the join table).
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    insert into public.notifications (user_id, task_id, type, message)
    values (new.assigned_to, new.id, 'task_assigned',
            'Bạn được giao công việc: ' || new.title);
    insert into public.task_history (task_id, by_user, action, note)
    values (new.id, actor, 'reassigned', 'assigned_to=' || new.assigned_to::text);
  end if;

  return new;
end;
$$;

-- 7d. Comments: notify creator + every assignee (deduped, excluding author).
create or replace function public.notify_task_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  recipient uuid;
begin
  select id, title, assigned_to, created_by into t
  from public.tasks where id = new.task_id;
  if t.id is null then
    return new;
  end if;
  for recipient in
    select distinct uid from (
      select user_id as uid from public.task_assignees where task_id = t.id
      union
      select t.assigned_to as uid
      union
      select t.created_by as uid
    ) s
    where uid is not null and uid <> new.user_id
  loop
    insert into public.notifications (user_id, task_id, type, message)
    values (recipient, t.id, 'task_commented',
            'Có bình luận mới trong: ' || t.title);
  end loop;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Update employee_performance view to count via task_assignees so a task
--    with N assignees contributes to all N employees' stats.
-- ----------------------------------------------------------------------------
create or replace view public.employee_performance
  with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.email,
  p.department,
  p.is_active,
  count(t.*)                                                            as total_tasks,
  count(t.*) filter (where t.status in ('pending','in_progress'))       as in_progress_tasks,
  count(t.*) filter (where t.status = 'submitted')                      as submitted_tasks,
  count(t.*) filter (where t.status = 'approved')                       as completed_tasks,
  count(t.*) filter (where t.status = 'rejected')                       as rejected_tasks,
  count(t.*) filter (
    where t.deadline is not null
      and t.deadline < now()
      and t.status not in ('approved','rejected')
  )                                                                      as overdue_tasks,
  count(t.*) filter (
    where t.status = 'approved'
      and t.deadline is not null
      and t.submitted_at is not null
      and t.submitted_at <= t.deadline
  )                                                                      as on_time_completed,
  count(t.*) filter (
    where t.status = 'approved'
      and t.deadline is not null
      and t.submitted_at is not null
      and t.submitted_at > t.deadline
  )                                                                      as late_completed,
  case
    when count(t.*) filter (where t.status = 'approved' and t.deadline is not null) = 0 then null
    else round(
      100.0
      * count(t.*) filter (
          where t.status = 'approved'
            and t.deadline is not null
            and t.submitted_at is not null
            and t.submitted_at <= t.deadline
        )
      / count(t.*) filter (where t.status = 'approved' and t.deadline is not null),
      1
    )
  end                                                                    as on_time_rate,
  case
    when count(t.*) filter (where t.status in ('approved','rejected')) = 0 then null
    else round(
      100.0
      * count(t.*) filter (where t.status = 'approved')
      / count(t.*) filter (where t.status in ('approved','rejected')),
      1
    )
  end                                                                    as approval_rate,
  case
    when count(t.*) = 0 then null
    else round(
      coalesce(
        case
          when count(t.*) filter (where t.status = 'approved' and t.deadline is not null) = 0 then 50.0
          else (
            100.0
            * count(t.*) filter (
                where t.status = 'approved'
                  and t.deadline is not null
                  and t.submitted_at is not null
                  and t.submitted_at <= t.deadline
              )
            / count(t.*) filter (where t.status = 'approved' and t.deadline is not null)
          )
        end * 0.5
        + case
            when count(t.*) filter (where t.status in ('approved','rejected')) = 0 then 50.0
            else (
              100.0
              * count(t.*) filter (where t.status = 'approved')
              / count(t.*) filter (where t.status in ('approved','rejected'))
            )
          end * 0.4
        + greatest(0, 10 - 5 * count(t.*) filter (
            where t.deadline is not null
              and t.deadline < now()
              and t.status not in ('approved','rejected')
          )),
        0
      ),
      1
    )
  end                                                                    as performance_score
from public.profiles p
left join public.task_assignees ta on ta.user_id = p.id
left join public.tasks t on t.id = ta.task_id
where p.role = 'employee'
group by p.id, p.full_name, p.email, p.department, p.is_active;

grant select on public.employee_performance to authenticated;
