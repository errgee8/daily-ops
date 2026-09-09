alter table if exists public.daily_tasks add column if not exists company text;
create index if not exists daily_tasks_company_idx on public.daily_tasks (company, date);
