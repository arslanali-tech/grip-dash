-- Branch Analytics Tabs Table
-- Stores configurable tabs for the Branch Analytics view per agency
-- Follows the same pattern as hub_tabs

-- =============================
-- Branch Analytics Tabs
-- =============================
create table if not exists public.branch_analytics_tabs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  slug text not null,
  icon text not null, -- icon identifier (e.g., 'LayoutDashboardIcon', 'BrainCircuitIcon')
  component_key text not null, -- key to map to React component
  sort_order integer not null default 0,
  is_system boolean not null default false, -- system tabs can't be deleted
  is_active boolean not null default true,
  enabled_for_roles text[] not null default array['owner', 'branch_manager', 'negotiator', 'admin', 'client', 'agency_user'],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_analytics_tabs_agency_slug_unique unique (agency_id, slug)
);

create index if not exists branch_analytics_tabs_agency_idx on public.branch_analytics_tabs (agency_id);
create index if not exists branch_analytics_tabs_sort_idx on public.branch_analytics_tabs (agency_id, sort_order);

alter table public.branch_analytics_tabs enable row level security;

-- Drop policies for re-runnable migration
drop policy if exists "client_select_branch_analytics_tabs" on public.branch_analytics_tabs;
drop policy if exists "client_insert_branch_analytics_tabs" on public.branch_analytics_tabs;
drop policy if exists "client_update_branch_analytics_tabs" on public.branch_analytics_tabs;
drop policy if exists "client_delete_branch_analytics_tabs" on public.branch_analytics_tabs;
drop policy if exists "staff_select_branch_analytics_tabs" on public.branch_analytics_tabs;

-- Client (agency) users can manage tabs within their agency
create policy "client_select_branch_analytics_tabs"
on public.branch_analytics_tabs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_analytics_tabs.agency_id
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

create policy "client_insert_branch_analytics_tabs"
on public.branch_analytics_tabs
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_analytics_tabs.agency_id
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

create policy "client_update_branch_analytics_tabs"
on public.branch_analytics_tabs
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_analytics_tabs.agency_id
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
    where c.agency_id = branch_analytics_tabs.agency_id
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

create policy "client_delete_branch_analytics_tabs"
on public.branch_analytics_tabs
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_analytics_tabs.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
  and branch_analytics_tabs.is_system = false -- Prevent deletion of system tabs
);

-- Staff can view active tabs
create policy "staff_select_branch_analytics_tabs"
on public.branch_analytics_tabs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = branch_analytics_tabs.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and branch_analytics_tabs.is_active = true
);

-- =============================
-- Function to initialize default tabs for a new agency
-- =============================
create or replace function public.init_branch_analytics_tabs_for_agency(p_agency_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Only insert if no tabs exist for this agency
  if not exists (select 1 from public.branch_analytics_tabs where agency_id = p_agency_id) then
    insert into public.branch_analytics_tabs (agency_id, name, slug, icon, component_key, sort_order, is_system) values
      (p_agency_id, 'Branch Overview', 'overview', 'LayoutDashboardIcon', 'BranchOverviewView', 1, true),
      (p_agency_id, 'Branch Intelligence', 'intelligence', 'BrainCircuitIcon', 'BranchIntelligenceView', 2, true),
      (p_agency_id, 'Team Performance', 'team-performance', 'UsersIcon', 'BranchTeamPerformanceView', 3, true),
      (p_agency_id, 'Data Analytics', 'data-analytics', 'BarChart2Icon', 'BranchDataAnalyticsView', 4, true),
      (p_agency_id, 'Reporting', 'reporting', 'FileTextIcon', 'BranchReportingView', 5, true);
  end if;
end;
$$;

-- =============================
-- Trigger to auto-initialize tabs when a new agency is created
-- =============================
create or replace function public.trigger_init_branch_analytics_tabs()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.init_branch_analytics_tabs_for_agency(NEW.id);
  return NEW;
end;
$$;

drop trigger if exists on_agency_created_init_branch_analytics_tabs on public.agencies;

create trigger on_agency_created_init_branch_analytics_tabs
  after insert on public.agencies
  for each row
  execute function public.trigger_init_branch_analytics_tabs();
