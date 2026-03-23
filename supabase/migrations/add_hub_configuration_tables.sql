-- Hub Configuration Tables
-- Adds:
--  - public.hub_tabs (custom tabs per agency for Task Hub)
--  - public.hub_categories (document and password categories per agency)
-- Plus indexes and RLS policies for client + staff roles.

-- =============================
-- Hub Tabs (Custom tabs for Task Hub)
-- =============================
create table if not exists public.hub_tabs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  slug text not null,
  icon text, -- optional icon identifier
  sort_order integer not null default 0,
  is_system boolean not null default false, -- system tabs can't be deleted
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_tabs_agency_slug_unique unique (agency_id, slug)
);

create index if not exists hub_tabs_agency_idx on public.hub_tabs (agency_id);
create index if not exists hub_tabs_sort_idx on public.hub_tabs (agency_id, sort_order);

alter table public.hub_tabs enable row level security;

-- Drop policies for re-runnable migration
drop policy if exists "client_select_hub_tabs" on public.hub_tabs;
drop policy if exists "client_insert_hub_tabs" on public.hub_tabs;
drop policy if exists "client_update_hub_tabs" on public.hub_tabs;
drop policy if exists "client_delete_hub_tabs" on public.hub_tabs;
drop policy if exists "staff_select_hub_tabs" on public.hub_tabs;

-- Client (agency) users can manage tabs within their agency
create policy "client_select_hub_tabs"
on public.hub_tabs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_tabs.agency_id
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

create policy "client_insert_hub_tabs"
on public.hub_tabs
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_tabs.agency_id
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

create policy "client_update_hub_tabs"
on public.hub_tabs
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_tabs.agency_id
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
    where c.agency_id = hub_tabs.agency_id
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

create policy "client_delete_hub_tabs"
on public.hub_tabs
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_tabs.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
  and hub_tabs.is_system = false -- Prevent deletion of system tabs
);

-- Staff can view active tabs
create policy "staff_select_hub_tabs"
on public.hub_tabs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_tabs.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and hub_tabs.is_active = true
);

-- =============================
-- Hub Categories (Document and Password categories)
-- =============================
create table if not exists public.hub_categories (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null check (type in ('document', 'password')),
  color text, -- optional color for UI
  icon text, -- optional icon identifier
  sort_order integer not null default 0,
  is_system boolean not null default false, -- system categories can't be deleted
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_categories_agency_type_slug_unique unique (agency_id, type, slug)
);

create index if not exists hub_categories_agency_idx on public.hub_categories (agency_id);
create index if not exists hub_categories_type_idx on public.hub_categories (agency_id, type);
create index if not exists hub_categories_sort_idx on public.hub_categories (agency_id, type, sort_order);

alter table public.hub_categories enable row level security;

-- Drop policies for re-runnable migration
drop policy if exists "client_select_hub_categories" on public.hub_categories;
drop policy if exists "client_insert_hub_categories" on public.hub_categories;
drop policy if exists "client_update_hub_categories" on public.hub_categories;
drop policy if exists "client_delete_hub_categories" on public.hub_categories;
drop policy if exists "staff_select_hub_categories" on public.hub_categories;

-- Client (agency) users can manage categories within their agency
create policy "client_select_hub_categories"
on public.hub_categories
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_categories.agency_id
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

create policy "client_insert_hub_categories"
on public.hub_categories
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_categories.agency_id
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

create policy "client_update_hub_categories"
on public.hub_categories
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_categories.agency_id
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
    where c.agency_id = hub_categories.agency_id
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

create policy "client_delete_hub_categories"
on public.hub_categories
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_categories.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
  and hub_categories.is_system = false -- Prevent deletion of system categories
);

-- Staff can view active categories
create policy "staff_select_hub_categories"
on public.hub_categories
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_categories.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and hub_categories.is_active = true
);

-- =============================
-- Function to initialize default tabs for a new agency
-- =============================
create or replace function public.init_hub_tabs_for_agency(p_agency_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Only insert if no tabs exist for this agency
  if not exists (select 1 from public.hub_tabs where agency_id = p_agency_id) then
    insert into public.hub_tabs (agency_id, name, slug, sort_order, is_system) values
      (p_agency_id, 'Individual details', 'individual-details', 1, true),
      (p_agency_id, 'Appointments', 'appointments', 2, true),
      (p_agency_id, 'Ownership', 'ownership', 3, true),
      (p_agency_id, 'Compliance', 'compliance', 4, true),
      (p_agency_id, 'History', 'history', 5, true),
      (p_agency_id, 'Data library', 'data-library', 6, true),
      (p_agency_id, 'Documents', 'documents', 7, true),
      (p_agency_id, 'Reports', 'reports', 8, true),
      (p_agency_id, 'Health & Safety', 'health-and-safety', 9, true),
      (p_agency_id, 'AML', 'aml', 10, true),
      (p_agency_id, 'Passwords', 'passwords', 11, true),
      (p_agency_id, 'Branding', 'branding', 12, true);
  end if;
end;
$$;

-- =============================
-- Function to initialize default categories for a new agency
-- =============================
create or replace function public.init_hub_categories_for_agency(p_agency_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Only insert document categories if none exist
  if not exists (select 1 from public.hub_categories where agency_id = p_agency_id and type = 'document') then
    insert into public.hub_categories (agency_id, name, slug, type, sort_order, is_system) values
      (p_agency_id, 'General', 'general', 'document', 1, true),
      (p_agency_id, 'Finance', 'finance', 'document', 2, true),
      (p_agency_id, 'HR', 'hr', 'document', 3, true),
      (p_agency_id, 'Marketing', 'marketing', 'document', 4, true),
      (p_agency_id, 'Operations', 'operations', 'document', 5, true),
      (p_agency_id, 'Compliance', 'compliance', 'document', 6, true),
      (p_agency_id, 'Management', 'management', 'document', 7, true);
  end if;

  -- Only insert password categories if none exist
  if not exists (select 1 from public.hub_categories where agency_id = p_agency_id and type = 'password') then
    insert into public.hub_categories (agency_id, name, slug, type, sort_order, is_system) values
      (p_agency_id, 'General', 'general', 'password', 1, true),
      (p_agency_id, 'Social Media', 'social-media', 'password', 2, true),
      (p_agency_id, 'Email', 'email', 'password', 3, true),
      (p_agency_id, 'Office / Security', 'office', 'password', 4, true),
      (p_agency_id, 'Finance', 'finance', 'password', 5, true),
      (p_agency_id, 'Cloud Services', 'cloud', 'password', 6, true);
  end if;
end;
$$;
