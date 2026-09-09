-- Additive migration for mandatory staff task proof photos.
alter table if exists public.daily_tasks
  add column if not exists completion_photo_url text;

create index if not exists daily_tasks_completed_at_idx
  on public.daily_tasks (date, status, completed_at);
