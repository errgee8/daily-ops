-- DAILY OPS multi-device security and attendance foundation.
-- Run this once in Supabase SQL Editor before enabling cloud sync in production.
-- Do not use a service-role key in the Android app.

create table if not exists public.staff_profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  app_user_id text unique not null,
  name text not null,
  role text not null check (role in ('MANAGER', 'ASSISTANT_MANAGER', 'STAFF')),
  assigned_venue_ids text[] not null default '{}',
  assigned_area_ids text[] not null default '{}',
  has_all_venue_access boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_profiles
    where auth_user_id = auth.uid() and role = 'MANAGER' and is_active
  );
$$;

create or replace function public.can_access_venue(target_venue_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_profiles p
    where p.auth_user_id = auth.uid() and p.is_active
      and (p.role = 'MANAGER' or p.has_all_venue_access or target_venue_id = any(p.assigned_venue_ids))
  );
$$;

create or replace function public.can_access_area(target_venue_id text, target_area_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_profiles p
    where p.auth_user_id = auth.uid() and p.is_active
      and (p.role = 'MANAGER' or p.has_all_venue_access
        or (target_venue_id = any(p.assigned_venue_ids)
          and (cardinality(p.assigned_area_ids) = 0 or target_area_id = any(p.assigned_area_ids))))
  );
$$;

create table if not exists public.daily_tasks (
  id text primary key, date date not null, venue_id text, venue_name text, area_id text, area_name text,
  title text not null, notes text, priority text not null, status text not null,
  created_by_user_id text not null, created_by_name text not null, created_at timestamptz not null,
  updated_at timestamptz not null, started_at timestamptz, started_by_user_id text, started_by_name text,
  completed_at timestamptz, completed_by_user_id text, completed_by_name text,
  completion_reason text, completion_note text, history jsonb not null default '[]'::jsonb,
  cloud_updated_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id text primary key, date date not null, venue_id text, started_at timestamptz not null,
  started_by_name text not null, started_by_role text not null, completed_at timestamptz,
  completed_by_name text, is_completed boolean not null default false, handed_over_at timestamptz,
  handed_over_by_name text, is_handed_over boolean not null default false, total_items integer not null,
  ready_items integer not null default 0, not_ready_items integer not null default 0, na_items integer not null default 0,
  total_issues_count integer not null default 0, item_results jsonb not null default '{}'::jsonb, notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.issues (
  id text primary key, inspection_date date not null, inspection_id text not null, venue_id text, venue_name text,
  area_id text not null, area_name text not null, item_id text not null, item_name text not null,
  criterion_id text not null, criterion_name text not null, specific_problems jsonb not null default '[]'::jsonb,
  custom_note text, photo_url text, photos jsonb not null default '[]'::jsonb, resolution_photo_url text,
  resolution_photos jsonb not null default '[]'::jsonb, discovered_at timestamptz not null,
  discovered_by_role text not null, discovered_by_name text not null, original_inspection_status text not null,
  department_id text not null, department_name text not null, current_status text not null,
  status_updated_at timestamptz not null, resolution_info jsonb, verification_info jsonb,
  reopen_count integer not null default 0, audit_trail jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.shift_notes (
  id text primary key, date date not null, venue_id text, venue_name text, area_id text, area_name text,
  author_id text not null, author_name text not null, author_role text not null, content text not null,
  category text, status text not null, created_at timestamptz not null, updated_at timestamptz not null,
  completed_at timestamptz, completed_by_name text
);

create table if not exists public.attendance_records (
  id text primary key, attendance_type text not null check (attendance_type in ('CHECK_IN', 'CHECK_OUT')),
  staff_user_id text not null, staff_name text not null, staff_role text not null,
  venue_id text not null, venue_name text not null, area_ids text[] not null default '{}',
  checklist_inspection_id text not null, checklist_completed_at timestamptz not null,
  captured_at timestamptz not null, server_received_at timestamptz not null default now(),
  wifi_ssid text, wifi_verified boolean not null, device_id text not null, selfie_url text not null,
  sync_status text not null default 'VERIFIED_CLOUD', rejection_reason text,
  created_by_auth_id uuid not null default auth.uid()
);

alter table public.staff_profiles enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.inspections enable row level security;
alter table public.issues enable row level security;
alter table public.shift_notes enable row level security;
alter table public.attendance_records enable row level security;

create policy "profiles readable by self or manager" on public.staff_profiles for select using (auth_user_id = auth.uid() or public.is_manager());
create policy "managers manage profiles" on public.staff_profiles for all using (public.is_manager()) with check (public.is_manager());

create policy "venue scoped tasks" on public.daily_tasks for all using (public.can_access_area(venue_id, area_id)) with check (public.can_access_area(venue_id, area_id));
create policy "venue scoped inspections" on public.inspections for all using (public.can_access_venue(venue_id)) with check (public.can_access_venue(venue_id));
create policy "venue scoped issues" on public.issues for all using (public.can_access_area(venue_id, area_id)) with check (public.can_access_area(venue_id, area_id));
create policy "venue scoped notes" on public.shift_notes for all using (public.can_access_area(venue_id, area_id)) with check (public.can_access_area(venue_id, area_id));
create policy "own attendance or manager" on public.attendance_records for select using (public.is_manager() or staff_user_id = (select app_user_id from public.staff_profiles where auth_user_id = auth.uid()));
create policy "staff create own attendance" on public.attendance_records for insert with check (
  public.can_access_venue(venue_id) and staff_user_id = (select app_user_id from public.staff_profiles where auth_user_id = auth.uid())
);

-- Required for multi-device updates to be broadcast immediately.
alter publication supabase_realtime add table public.daily_tasks, public.inspections, public.issues, public.shift_notes, public.attendance_records;
