-- ============================================================================
-- Triggers: notifications + task_history audit log
-- ============================================================================

-- Insert a notification for the assignee when a new task is created.
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null then
    insert into public.notifications (user_id, task_id, type, message)
    values (
      new.assigned_to,
      new.id,
      'task_assigned',
      'Bạn được giao công việc mới: ' || new.title
    );
  end if;
  insert into public.task_history (task_id, by_user, action, to_status)
  values (new.id, new.created_by, 'created', new.status);
  return new;
end;
$$;

drop trigger if exists tasks_after_insert on public.tasks;
create trigger tasks_after_insert
  after insert on public.tasks
  for each row execute procedure public.notify_task_assigned();

-- Insert notifications + history when a task changes status or assignee.
create or replace function public.notify_task_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if new.status is distinct from old.status then
    insert into public.task_history (task_id, by_user, action, from_status, to_status, note)
    values (new.id, actor, 'status_changed', old.status, new.status, new.review_note);

    if new.status = 'submitted' and new.created_by is not null then
      insert into public.notifications (user_id, task_id, type, message)
      values (new.created_by, new.id, 'task_submitted',
              'Nhân viên đã nộp công việc: ' || new.title);
    elsif new.status = 'approved' and new.assigned_to is not null then
      insert into public.notifications (user_id, task_id, type, message)
      values (new.assigned_to, new.id, 'task_approved',
              'Công việc của bạn đã được duyệt: ' || new.title);
    elsif new.status = 'rejected' and new.assigned_to is not null then
      insert into public.notifications (user_id, task_id, type, message)
      values (new.assigned_to, new.id, 'task_rejected',
              'Công việc của bạn cần chỉnh sửa: ' || new.title);
    end if;
  end if;

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

drop trigger if exists tasks_after_update on public.tasks;
create trigger tasks_after_update
  after update on public.tasks
  for each row execute procedure public.notify_task_updated();

-- Notify assignee/creator when a comment is posted.
create or replace function public.notify_task_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select id, title, assigned_to, created_by into t from public.tasks where id = new.task_id;
  if t.id is null then
    return new;
  end if;
  if t.assigned_to is not null and t.assigned_to <> new.user_id then
    insert into public.notifications (user_id, task_id, type, message)
    values (t.assigned_to, t.id, 'task_commented',
            'Có bình luận mới trong: ' || t.title);
  end if;
  if t.created_by is not null and t.created_by <> new.user_id and t.created_by <> coalesce(t.assigned_to, '00000000-0000-0000-0000-000000000000'::uuid) then
    insert into public.notifications (user_id, task_id, type, message)
    values (t.created_by, t.id, 'task_commented',
            'Có bình luận mới trong: ' || t.title);
  end if;
  return new;
end;
$$;

drop trigger if exists comments_after_insert on public.task_comments;
create trigger comments_after_insert
  after insert on public.task_comments
  for each row execute procedure public.notify_task_commented();
