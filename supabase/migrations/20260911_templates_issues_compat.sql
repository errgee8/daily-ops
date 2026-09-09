-- Compatibility tables/columns used by the template and issue screens.
create table if not exists public.hndvr_templates (
  id text primary key,
  venue_id text not null,
  template jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists hndvr_templates_venue_idx on public.hndvr_templates (venue_id, updated_at desc);

create table if not exists public.templates (
  id text primary key,
  venue_id text not null,
  name text not null default 'Checklist Master Template',
  version integer not null default 1,
  is_active boolean not null default true,
  areas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists templates_venue_idx on public.templates (venue_id, updated_at desc);

alter table if exists public.issues add column if not exists discovered_by_id text;
alter table if exists public.issues add column if not exists resolved_by_id text;
alter table if exists public.issues add column if not exists resolved_by_name text;
alter table if exists public.issues add column if not exists resolved_by_role text;
alter table if exists public.issues add column if not exists resolution_notes text;
alter table if exists public.issues add column if not exists verified_at timestamptz;
alter table if exists public.issues add column if not exists verified_by_id text;
alter table if exists public.issues add column if not exists verified_by_name text;
alter table if exists public.issues add column if not exists verified_by_role text;
alter table if exists public.issues add column if not exists verification_notes text;
alter table if exists public.issues add column if not exists resolved_at timestamptz;

alter table if exists public.hndvr_templates enable row level security;
alter table if exists public.templates enable row level security;
