-- Branch Goals Table
-- Stores real goals for branch performance tracking
-- Goals can be created, updated, and tracked against actual progress

-- =============================
-- Branch Goals
-- =============================
create table if not exists public.branch_goals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id) on delete cascade,
  title text not null,
  description text,
  goal_type text not null check (goal_type in ('revenue', 'instructions', 'completions', 'lettings', 'valuations', 'custom')),
  target_value numeric not null default 0,
  current_value numeric not null default 0,
  unit text not null default 'units', -- e.g., '£', 'deals', 'instructions', '%'
  start_date date not null default current_date,
  deadline date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'at-risk', 'on-track')),
  owner_id uuid references public.staff_members(id) on delete set null,
  owner_name text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  is_auto_tracked boolean not null default false, -- If true, current_value is computed from movements
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists branch_goals_agency_idx on public.branch_goals (agency_id);
create index if not exists branch_goals_branch_idx on public.branch_goals (branch_id);
create index if not exists branch_goals_status_idx on public.branch_goals (status);
create index if not exists branch_goals_deadline_idx on public.branch_goals (deadline);

alter table public.branch_goals enable row level security;

-- Drop policies for re-runnable migration
drop policy if exists "client_select_branch_goals" on public.branch_goals;
drop policy if exists "client_insert_branch_goals" on public.branch_goals;
drop policy if exists "client_update_branch_goals" on public.branch_goals;
drop policy if exists "client_delete_branch_goals" on public.branch_goals;
drop policy if exists "staff_select_branch_goals" on public.branch_goals;

-- Client (agency) users can manage goals within their agency
create policy "client_select_branch_goals"
on public.branch_goals
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_insert_branch_goals"
on public.branch_goals
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_update_branch_goals"
on public.branch_goals
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_delete_branch_goals"
on public.branch_goals
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

-- Staff can view goals for their branch
create policy "staff_select_branch_goals"
on public.branch_goals
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
);

-- =============================
-- Function to compute goal status based on progress
-- =============================
create or replace function public.compute_goal_status(
  p_current_value numeric,
  p_target_value numeric,
  p_deadline date
)
returns text
language plpgsql
immutable
as $$
declare
  progress_pct numeric;
  days_remaining integer;
  expected_progress numeric;
begin
  if p_target_value <= 0 then
    return 'active';
  end if;
  
  progress_pct := (p_current_value / p_target_value) * 100;
  days_remaining := p_deadline - current_date;
  
  -- If completed
  if progress_pct >= 100 then
    return 'completed';
  end if;
  
  -- If past deadline
  if days_remaining < 0 then
    return 'at-risk';
  end if;
  
  -- Calculate expected progress based on time elapsed
  -- Assume linear progress from start_date to deadline
  expected_progress := 100 - (days_remaining::numeric / 365 * 100);
  expected_progress := greatest(0, least(100, expected_progress));
  
  -- If behind expected progress by >20%, mark as at-risk
  if progress_pct < (expected_progress - 20) then
    return 'at-risk';
  end if;
  
  return 'on-track';
end;
$$;

-- =============================
-- Trigger to auto-update status on goal changes
-- =============================
create or replace function public.trigger_update_goal_status()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only auto-update status if not manually set to completed/cancelled
  if NEW.status not in ('completed', 'cancelled') then
    NEW.status := public.compute_goal_status(NEW.current_value, NEW.target_value, NEW.deadline);
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists on_goal_update_compute_status on public.branch_goals;

create trigger on_goal_update_compute_status
  before insert or update on public.branch_goals
  for each row
  execute function public.trigger_update_goal_status();

-- =============================
-- Function to initialize sample goals for testing
-- =============================
create or replace function public.init_sample_branch_goals(p_agency_id uuid, p_branch_id uuid default null)
returns void
language plpgsql
security definer
as $$
begin
  -- Only insert if no goals exist for this agency
  if not exists (select 1 from public.branch_goals where agency_id = p_agency_id) then
    insert into public.branch_goals (agency_id, branch_id, title, description, goal_type, target_value, current_value, unit, deadline, owner_name, priority, is_auto_tracked) values
      (p_agency_id, p_branch_id, 'Q1 Revenue Target', 'Achieve £250,000 in total revenue for Q1', 'revenue', 250000, 0, '£', (date_trunc('quarter', current_date) + interval '3 months' - interval '1 day')::date, 'Branch Manager', 'high', true),
      (p_agency_id, p_branch_id, 'Monthly Instructions', 'Secure 20 new instructions this month', 'instructions', 20, 0, 'instructions', (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date, 'Sales Team', 'medium', true),
      (p_agency_id, p_branch_id, 'Completions Target', 'Complete 15 deals this quarter', 'completions', 15, 0, 'deals', (date_trunc('quarter', current_date) + interval '3 months' - interval '1 day')::date, 'Negotiations Team', 'high', true),
      (p_agency_id, p_branch_id, 'Lettings Revenue', 'Generate £50,000 in lettings revenue', 'lettings', 50000, 0, '£', (date_trunc('quarter', current_date) + interval '3 months' - interval '1 day')::date, 'Lettings Manager', 'medium', true);
  end if;
end;
$$;
