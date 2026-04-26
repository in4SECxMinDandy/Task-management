-- ============================================================================
-- Quan Ly Cong Viec - initial schema
-- Run once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'employee');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('pending', 'in_progress', 'submitted', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'attachment_kind') then
    create type attachment_kind as enum ('assignment', 'submission');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum (
      'task_assigned',
      'task_due_soon',
      'task_overdue',
      'task_submitted',
      'task_approved',
      'task_rejected',
      'task_commented'
    );
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null,
  email                 text not null,
  role                  app_role not null default 'employee',
  department            text,
  avatar_url            text,
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_active_idx on public.profiles(is_active);

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  created_by        uuid references public.profiles(id) on delete set null,
  assigned_to      uuid references public.profiles(id) on delete set null,
  deadline          timestamptz,
  priority          task_priority not null default 'medium',
  status            task_status not null default 'pending',
  progress          int not null default 0 check (progress between 0 and 100),
  submission_note   text,
  review_note       text,
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_deadline_idx on public.tasks(deadline);

-- ----------------------------------------------------------------------------
-- task_attachments
-- ----------------------------------------------------------------------------
create table if not exists public.task_attachments (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  kind          attachment_kind not null,
  storage_path  text not null,
  file_name     text not null,
  file_size     bigint,
  mime_type     text,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

create index if not exists task_attachments_task_idx on public.task_attachments(task_id);

-- ----------------------------------------------------------------------------
-- task_comments
-- ----------------------------------------------------------------------------
create table if not exists public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments(task_id);

-- ----------------------------------------------------------------------------
-- task_history (audit log)
-- ----------------------------------------------------------------------------
create table if not exists public.task_history (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  by_user       uuid references public.profiles(id) on delete set null,
  action        text not null,
  from_status   task_status,
  to_status     task_status,
  note          text,
  at            timestamptz not null default now()
);

create index if not exists task_history_task_idx on public.task_history(task_id);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete cascade,
  type        notification_type not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();
