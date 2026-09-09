-- DAILY OPS online operations migration (current migration).
-- Run this file once in Supabase SQL Editor, after taking a database backup.
-- The application server uses SUPABASE_SERVICE_ROLE_KEY; never put that key in VITE_* or Android.

create table if not exists public.users (
  id text primary key,
  venue_id text not null default 'venue-default',
  name text not null,
  role text not null default 'STAFF',
  status text not null default 'ACTIVE',
  pin_hash text,
  salt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users add column if not exists pin_algorithm text not null default 'legacy_sha256';
alter table public.users add column if not exists company text;
alter table public.users add column if not exists division text;
alter table public.users add column if not exists photo_url text;
alter table public.users add column if not exists assigned_venue_ids text[] not null default '{}';
alter table public.users add column if not exists assigned_area_ids text[] not null default '{}';
alter table public.users add column if not exists has_all_venue_access boolean not null default false;
alter table public.users add column if not exists token_version integer not null default 1;
create index if not exists users_venue_idx on public.users (venue_id);

alter table public.daily_tasks add column if not exists assigned_to_user_id text;
alter table public.daily_tasks add column if not exists assigned_to_role text;
alter table public.daily_tasks add column if not exists version integer not null default 1;
create index if not exists daily_tasks_assignee_idx on public.daily_tasks (assigned_to_user_id, date);
create index if not exists daily_tasks_venue_date_idx on public.daily_tasks (venue_id, date);

create table if not exists public.task_events (
  id bigint generated always as identity primary key,
  task_id text not null,
  venue_id text not null,
  actor_user_id text not null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists task_events_task_idx on public.task_events (task_id, created_at desc);

create table if not exists public.attendance_records (
  id text primary key,
  attendance_type text not null check (attendance_type in ('CHECK_IN', 'CHECK_OUT')),
  staff_user_id text not null references public.users(id),
  staff_name text not null,
  staff_role text not null,
  venue_id text not null,
  venue_name text,
  area_ids text[] not null default '{}',
  checklist_inspection_id text,
  checklist_completed_at timestamptz,
  captured_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  wifi_ssid text,
  wifi_verified boolean not null default false,
  device_id text not null,
  selfie_url text not null,
  sync_status text not null default 'VERIFIED_CLOUD' check (sync_status in ('PENDING_CLOUD', 'VERIFIED_CLOUD', 'REJECTED')),
  rejection_reason text
);
create index if not exists attendance_staff_time_idx on public.attendance_records (staff_user_id, captured_at desc);
create index if not exists attendance_venue_time_idx on public.attendance_records (venue_id, captured_at desc);

create table if not exists public.device_push_tokens (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text not null,
  updated_at timestamptz not null default now()
);

-- Sensitive tables are accessed through the authenticated API only.  The
-- service-role server bypasses RLS; anonymous browser credentials get no rows.
alter table public.users enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.attendance_records enable row level security;
alter table public.device_push_tokens enable row level security;

-- Do not create permissive anon policies here. The custom PIN is verified by
-- server.ts, which applies role, venue and assignee scopes before every query.
