-- Agencies table
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Agency admins table
create table if not exists public.agency_admins (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Clients table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  contact_name text,
  email text not null,
  phone text,
  address text,
  status text default 'active',
  package text default 'Standard',
  enabled_modules jsonb,
  created_at timestamptz default now()
);

-- Ensure column exists for older projects where the table was created before this field
alter table public.clients add column if not exists enabled_modules jsonb;

-- Invitations table (optional, for tracking)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  agency_id uuid references public.agencies(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Approved GRIP owner email allow-list (used for owner access)
create table if not exists public.grip_owner_emails (
  email text primary key,
  is_approved boolean not null default false,
  created_at timestamptz default now()
);

-- Owner prospects (estate agents)
create table if not exists public.owner_prospects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  added_date date default current_date,
  name text not null,
  agency text not null,
  email text not null,
  phone text,
  address text,
  status text not null default 'prospect',
  last_interaction_type text,
  last_interaction_date date,
  last_interaction_notes text,
  created_at timestamptz default now()
);

-- Signup orders (Create Order)
create table if not exists public.signup_orders (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  prospect_id uuid references public.owner_prospects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  agency_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  address text,
  plan text not null,
  branches integer,
  users integer,
  notes text,
  status text not null default 'sent',
  created_at timestamptz default now()
);

-- Client updates / broadcasts / messages
create table if not exists public.client_updates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  type text not null, -- 'update' | 'message'
  recipients text not null default 'all',
  subject text not null,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Support tickets (shown in Client Updates tab)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  client text not null,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  created_at timestamptz default now()
);

-- =============================
-- Owner dashboard dynamic data
-- =============================

-- Snapshot metrics shown in OwnerSummaryCards
create table if not exists public.owner_metrics (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  grip_revenue numeric,
  grip_revenue_change numeric,
  signups integer,
  signups_change numeric,
  branches integer,
  movements integer,
  movements_change numeric,
  client_revenue numeric,
  client_revenue_change numeric,
  prospects integer,
  prospects_change numeric,
  prospects_converted integer,
  prospects_converted_change numeric,
  snapshot_date date default current_date,
  created_at timestamptz default now()
);

-- Required for upsertOwnerMetrics(onConflict: 'agency_id,snapshot_date')
do $$
begin
  alter table public.owner_metrics
    add constraint owner_metrics_agency_snapshot_unique unique (agency_id, snapshot_date);
exception
  when duplicate_object then null;
end $$;

-- Time series for GRIP/Client revenue charts in OwnerAnalyticsView
create table if not exists public.owner_revenue_timeseries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  series_type text not null, -- 'grip' | 'client'
  period text not null,      -- e.g. 'Jan 2026'
  revenue numeric not null,
  period_start date,
  created_at timestamptz default now()
);

-- Simple subscription metadata per client for BillingView
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  plan text not null,
  amount numeric not null,
  currency text default 'GBP',
  status text not null default 'active', -- 'active' | 'past_due' | 'canceled'
  next_billing_date date,
  created_at timestamptz default now()
);

-- Client invoices (shown in ClientInvoicesDialog)
create table if not exists public.client_invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  amount numeric not null,
  currency text default 'GBP',
  status text not null default 'pending', -- 'paid' | 'pending' | 'overdue'
  pdf_url text,
  created_at timestamptz default now()
);

-- Owner password vault items (demo; consider encryption/RLS for production)
create table if not exists public.password_vault_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  username text,
  secret text not null,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compliance tasks for the owner dashboard
create table if not exists public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  type text not null,
  description text not null,
  reminder_date date not null,
  event_date date not null,
  assigned_to text not null,
  is_completed boolean default false,
  created_at timestamptz default now()
);

-- Branches table for agency and branch management
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  address text,
  city text,
  postcode text,
  manager text,
  team_size integer default 0,
  active_listings integer default 0,
  total_sales numeric default 0,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- Staff members table for agency staff management (Owner Business Manager -> Staff)
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  role text not null,
  branch_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  status text not null default 'active', -- 'active' | 'away' | 'offline'
  basic_wage numeric,
  employer_nics numeric,
  employer_pension numeric,
  holiday_allowance integer default 28,
  commission_breakdown jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Business Manager sections configuration (per agency)
create table if not exists public.agency_business_sections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  key text not null,
  label text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  unique (agency_id, key)
);

-- =============================================
-- Row Level Security (RLS) for branches & sections
-- =============================================

-- Enable RLS on branches
alter table public.branches enable row level security;

drop policy if exists "owner_select_own_branches" on public.branches;
drop policy if exists "owner_insert_own_branches" on public.branches;
drop policy if exists "owner_update_own_branches" on public.branches;
drop policy if exists "owner_delete_own_branches" on public.branches;

-- Owners can select only their own branches
create policy "owner_select_own_branches"
on public.branches
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = branches.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Client access to their own client row (matched by email)
drop policy if exists "client_select_self" on public.clients;
create policy "client_select_self"
on public.clients
for select
using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Owners can insert branches only for their own agencies
create policy "owner_insert_own_branches"
on public.branches
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = branches.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can update only their own branches
create policy "owner_update_own_branches"
on public.branches
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = branches.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = branches.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can delete only their own branches
create policy "owner_delete_own_branches"
on public.branches
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = branches.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Enable RLS on staff_members
alter table public.staff_members enable row level security;

drop policy if exists "owner_select_own_staff_members" on public.staff_members;
drop policy if exists "owner_insert_own_staff_members" on public.staff_members;
drop policy if exists "owner_update_own_staff_members" on public.staff_members;
drop policy if exists "owner_delete_own_staff_members" on public.staff_members;

-- Owners can select only their own staff members
create policy "owner_select_own_staff_members"
on public.staff_members
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = staff_members.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can insert staff members only for their own agencies
create policy "owner_insert_own_staff_members"
on public.staff_members
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = staff_members.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can update only their own staff members
create policy "owner_update_own_staff_members"
on public.staff_members
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = staff_members.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = staff_members.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can delete only their own staff members
create policy "owner_delete_own_staff_members"
on public.staff_members
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = staff_members.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Enable RLS on agency_business_sections
alter table public.agency_business_sections enable row level security;

drop policy if exists "owner_select_own_sections" on public.agency_business_sections;
drop policy if exists "owner_insert_own_sections" on public.agency_business_sections;
drop policy if exists "owner_update_own_sections" on public.agency_business_sections;
drop policy if exists "owner_delete_own_sections" on public.agency_business_sections;

-- Owners can see only their own Business Manager sections
create policy "owner_select_own_sections"
on public.agency_business_sections
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = agency_business_sections.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can insert sections only for their own agencies
create policy "owner_insert_own_sections"
on public.agency_business_sections
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = agency_business_sections.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can update only their own sections
create policy "owner_update_own_sections"
on public.agency_business_sections
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = agency_business_sections.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = agency_business_sections.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can delete only their own sections
create policy "owner_delete_own_sections"
on public.agency_business_sections
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = agency_business_sections.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- =============================================
-- Client-level branches & staff (per estate-agent client)
-- =============================================

create table if not exists public.client_branches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  email text,
  enabled_modules jsonb,
  created_at timestamptz default now()
);

create table if not exists public.client_staff (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    branch_id uuid references public.client_branches(id) on delete set null,
    name text not null,
    email text not null,
    role text not null,
    enabled_modules jsonb,
    basic_wage numeric,
    employer_nics numeric,
    employer_pension numeric,
    holiday_allowance integer default 28,
    commission_breakdown jsonb,
    prospector_dashboard_config jsonb,
    created_at timestamptz default now()
  );

  -- Extend client_staff with compensation fields when the table already exists.
  alter table public.client_staff add column if not exists basic_wage numeric;
  alter table public.client_staff add column if not exists employer_nics numeric;
  alter table public.client_staff add column if not exists employer_pension numeric;
  alter table public.client_staff add column if not exists holiday_allowance integer default 28;
  alter table public.client_staff add column if not exists commission_breakdown jsonb;
  alter table public.client_staff add column if not exists prospector_dashboard_config jsonb;
  
  -- Enable RLS on client_branches
alter table public.client_branches enable row level security;

drop policy if exists "owner_select_own_client_branches" on public.client_branches;
drop policy if exists "owner_insert_own_client_branches" on public.client_branches;
drop policy if exists "owner_update_own_client_branches" on public.client_branches;
drop policy if exists "owner_delete_own_client_branches" on public.client_branches;

-- Owners can manage branches only for their own clients (via agencies)
create policy "owner_select_own_client_branches"
on public.client_branches
for select
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_branches.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_client_branches"
on public.client_branches
for insert
with check (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_branches.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_client_branches"
on public.client_branches
for update
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_branches.client_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_branches.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_client_branches"
on public.client_branches
for delete
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_branches.client_id
      and a.owner_user_id = auth.uid()
  )
);

-- Allow client users to manage only their own branches (matched by email)
drop policy if exists "client_select_own_client_branches" on public.client_branches;
drop policy if exists "client_insert_own_client_branches" on public.client_branches;
drop policy if exists "client_update_own_client_branches" on public.client_branches;
drop policy if exists "client_delete_own_client_branches" on public.client_branches;

create policy "client_select_own_client_branches"
on public.client_branches
for select
using (
  exists (
    select 1 from public.clients c
    where c.id = client_branches.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

create policy "client_insert_own_client_branches"
on public.client_branches
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_branches.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

create policy "client_update_own_client_branches"
on public.client_branches
for update
using (
  exists (
    select 1 from public.clients c
    where c.id = client_branches.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_branches.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

create policy "client_delete_own_client_branches"
on public.client_branches
for delete
using (
  exists (
    select 1 from public.clients c
    where c.id = client_branches.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Enable RLS on client_staff
alter table public.client_staff enable row level security;

drop policy if exists "owner_select_own_client_staff" on public.client_staff;
drop policy if exists "owner_insert_own_client_staff" on public.client_staff;
drop policy if exists "owner_update_own_client_staff" on public.client_staff;
drop policy if exists "owner_delete_own_client_staff" on public.client_staff;

create policy "owner_select_own_client_staff"
on public.client_staff
for select
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_client_staff"
on public.client_staff
for insert
with check (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_client_staff"
on public.client_staff
for update
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff.client_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_client_staff"
on public.client_staff
for delete
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff.client_id
      and a.owner_user_id = auth.uid()
  )
);

-- Allow client users to manage only their own staff (matched by email or client_id)
-- (Also ensures branch_id, when set, belongs to the same client)
drop policy if exists "client_select_own_client_staff" on public.client_staff;
drop policy if exists "client_insert_own_client_staff" on public.client_staff;
drop policy if exists "client_update_own_client_staff" on public.client_staff;
drop policy if exists "client_delete_own_client_staff" on public.client_staff;

create policy "client_select_own_client_staff"
on public.client_staff
for select
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

create policy "client_insert_own_client_staff"
on public.client_staff
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
  and (
    client_staff.branch_id is null
    or exists (
      select 1 from public.client_branches cb
      where cb.id = client_staff.branch_id
        and cb.client_id = client_staff.client_id
    )
  )
);

create policy "client_update_own_client_staff"
on public.client_staff
for update
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
  and (
    client_staff.branch_id is null
    or exists (
      select 1 from public.client_branches cb
      where cb.id = client_staff.branch_id
        and cb.client_id = client_staff.client_id
    )
  )
);

create policy "client_delete_own_client_staff"
on public.client_staff
for delete
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- =============================================
-- Additional RLS policies for Owner Dashboard tables
-- =============================================

-- Agencies
alter table public.agencies enable row level security;

drop policy if exists "owner_select_own_agencies" on public.agencies;
drop policy if exists "owner_insert_own_agencies" on public.agencies;
drop policy if exists "owner_update_own_agencies" on public.agencies;
drop policy if exists "owner_delete_own_agencies" on public.agencies;

create policy "owner_select_own_agencies"
on public.agencies
for select
using (owner_user_id = auth.uid());

create policy "owner_insert_own_agencies"
on public.agencies
for insert
with check (owner_user_id = auth.uid());

create policy "owner_update_own_agencies"
on public.agencies
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner_delete_own_agencies"
on public.agencies
for delete
using (owner_user_id = auth.uid());

-- Clients
alter table public.clients enable row level security;

drop policy if exists "owner_select_own_clients" on public.clients;
drop policy if exists "owner_insert_own_clients" on public.clients;
drop policy if exists "owner_update_own_clients" on public.clients;
drop policy if exists "owner_delete_own_clients" on public.clients;

create policy "owner_select_own_clients"
on public.clients
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = clients.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_clients"
on public.clients
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = clients.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_clients"
on public.clients
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = clients.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = clients.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_clients"
on public.clients
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = clients.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owner allow-list table
alter table public.grip_owner_emails enable row level security;

drop policy if exists "select_own_grip_owner_email" on public.grip_owner_emails;
create policy "select_own_grip_owner_email"
on public.grip_owner_emails
for select
to authenticated
using (email = lower(auth.jwt() ->> 'email'));

-- Owner prospects
alter table public.owner_prospects enable row level security;

drop policy if exists "owner_select_own_owner_prospects" on public.owner_prospects;
drop policy if exists "owner_insert_own_owner_prospects" on public.owner_prospects;
drop policy if exists "owner_update_own_owner_prospects" on public.owner_prospects;
drop policy if exists "owner_delete_own_owner_prospects" on public.owner_prospects;

create policy "owner_select_own_owner_prospects"
on public.owner_prospects
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_prospects.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_owner_prospects"
on public.owner_prospects
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = owner_prospects.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_owner_prospects"
on public.owner_prospects
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_prospects.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = owner_prospects.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_owner_prospects"
on public.owner_prospects
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_prospects.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Signup orders
alter table public.signup_orders enable row level security;

drop policy if exists "owner_select_own_signup_orders" on public.signup_orders;
drop policy if exists "owner_insert_own_signup_orders" on public.signup_orders;
drop policy if exists "owner_update_own_signup_orders" on public.signup_orders;
drop policy if exists "owner_delete_own_signup_orders" on public.signup_orders;

create policy "owner_select_own_signup_orders"
on public.signup_orders
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = signup_orders.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_signup_orders"
on public.signup_orders
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = signup_orders.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_signup_orders"
on public.signup_orders
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = signup_orders.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = signup_orders.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_signup_orders"
on public.signup_orders
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = signup_orders.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Client updates
alter table public.client_updates enable row level security;

drop policy if exists "owner_select_own_client_updates" on public.client_updates;
drop policy if exists "owner_insert_own_client_updates" on public.client_updates;
drop policy if exists "owner_update_own_client_updates" on public.client_updates;
drop policy if exists "owner_delete_own_client_updates" on public.client_updates;

create policy "owner_select_own_client_updates"
on public.client_updates
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = client_updates.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_client_updates"
on public.client_updates
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = client_updates.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_client_updates"
on public.client_updates
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = client_updates.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = client_updates.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_client_updates"
on public.client_updates
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = client_updates.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Support tickets
alter table public.support_tickets enable row level security;

drop policy if exists "owner_select_own_support_tickets" on public.support_tickets;
drop policy if exists "owner_insert_own_support_tickets" on public.support_tickets;
drop policy if exists "owner_update_own_support_tickets" on public.support_tickets;
drop policy if exists "owner_delete_own_support_tickets" on public.support_tickets;

create policy "owner_select_own_support_tickets"
on public.support_tickets
for select
using (
  agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = support_tickets.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_support_tickets"
on public.support_tickets
for insert
with check (
  agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = support_tickets.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_support_tickets"
on public.support_tickets
for update
using (
  agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = support_tickets.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = support_tickets.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_support_tickets"
on public.support_tickets
for delete
using (
  agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = support_tickets.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owner metrics
alter table public.owner_metrics enable row level security;

drop policy if exists "owner_select_own_owner_metrics" on public.owner_metrics;
drop policy if exists "owner_insert_own_owner_metrics" on public.owner_metrics;
drop policy if exists "owner_update_own_owner_metrics" on public.owner_metrics;
drop policy if exists "owner_delete_own_owner_metrics" on public.owner_metrics;

create policy "owner_select_own_owner_metrics"
on public.owner_metrics
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_metrics.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_owner_metrics"
on public.owner_metrics
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = owner_metrics.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_owner_metrics"
on public.owner_metrics
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_metrics.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = owner_metrics.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_owner_metrics"
on public.owner_metrics
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_metrics.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Owner revenue timeseries
alter table public.owner_revenue_timeseries enable row level security;

drop policy if exists "owner_select_own_owner_revenue_timeseries" on public.owner_revenue_timeseries;
create policy "owner_select_own_owner_revenue_timeseries"
on public.owner_revenue_timeseries
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = owner_revenue_timeseries.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Subscriptions
alter table public.subscriptions enable row level security;

drop policy if exists "owner_select_own_subscriptions" on public.subscriptions;
drop policy if exists "owner_insert_own_subscriptions" on public.subscriptions;
drop policy if exists "owner_update_own_subscriptions" on public.subscriptions;
drop policy if exists "owner_delete_own_subscriptions" on public.subscriptions;

create policy "owner_select_own_subscriptions"
on public.subscriptions
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = subscriptions.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_subscriptions"
on public.subscriptions
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = subscriptions.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_subscriptions"
on public.subscriptions
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = subscriptions.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = subscriptions.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_subscriptions"
on public.subscriptions
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = subscriptions.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Client invoices
alter table public.client_invoices enable row level security;

drop policy if exists "owner_select_own_client_invoices" on public.client_invoices;
drop policy if exists "owner_insert_own_client_invoices" on public.client_invoices;
drop policy if exists "owner_update_own_client_invoices" on public.client_invoices;
drop policy if exists "owner_delete_own_client_invoices" on public.client_invoices;

create policy "owner_select_own_client_invoices"
on public.client_invoices
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = client_invoices.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_client_invoices"
on public.client_invoices
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = client_invoices.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_client_invoices"
on public.client_invoices
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = client_invoices.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = client_invoices.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_client_invoices"
on public.client_invoices
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = client_invoices.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Password vault
alter table public.password_vault_items enable row level security;

drop policy if exists "owner_select_own_password_vault_items" on public.password_vault_items;
drop policy if exists "owner_insert_own_password_vault_items" on public.password_vault_items;
drop policy if exists "owner_update_own_password_vault_items" on public.password_vault_items;
drop policy if exists "owner_delete_own_password_vault_items" on public.password_vault_items;

create policy "owner_select_own_password_vault_items"
on public.password_vault_items
for select
using (owner_user_id = auth.uid());

create policy "owner_insert_own_password_vault_items"
on public.password_vault_items
for insert
with check (owner_user_id = auth.uid());

create policy "owner_update_own_password_vault_items"
on public.password_vault_items
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owner_delete_own_password_vault_items"
on public.password_vault_items
for delete
using (owner_user_id = auth.uid());

-- Compliance tasks
alter table public.compliance_tasks enable row level security;

drop policy if exists "owner_select_own_compliance_tasks" on public.compliance_tasks;
drop policy if exists "owner_insert_own_compliance_tasks" on public.compliance_tasks;
drop policy if exists "owner_update_own_compliance_tasks" on public.compliance_tasks;
drop policy if exists "owner_delete_own_compliance_tasks" on public.compliance_tasks;

create policy "owner_select_own_compliance_tasks"
on public.compliance_tasks
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = compliance_tasks.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_compliance_tasks"
on public.compliance_tasks
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = compliance_tasks.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_compliance_tasks"
on public.compliance_tasks
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = compliance_tasks.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = compliance_tasks.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_compliance_tasks"
on public.compliance_tasks
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = compliance_tasks.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- =============================
-- Business Manager dynamic tables
-- =============================

-- B2B partner companies
create table if not exists public.b2b_companies (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  type text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  commission_type text not null,
  commission_value numeric not null default 0,
  notes text,
  total_referrals integer not null default 0,
  total_commission numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.b2b_companies enable row level security;

drop policy if exists "owner_select_own_b2b_companies" on public.b2b_companies;
drop policy if exists "owner_insert_own_b2b_companies" on public.b2b_companies;
drop policy if exists "owner_update_own_b2b_companies" on public.b2b_companies;
drop policy if exists "owner_delete_own_b2b_companies" on public.b2b_companies;

create policy "owner_select_own_b2b_companies"
on public.b2b_companies
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_companies.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_b2b_companies"
on public.b2b_companies
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_companies.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_b2b_companies"
on public.b2b_companies
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_companies.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_companies.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_b2b_companies"
on public.b2b_companies
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_companies.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Health & Safety items
create table if not exists public.health_safety_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  title text not null,
  category text not null,
  status text not null default 'pending',
  due_date date,
  last_updated date not null default current_date,
  assigned_to text not null,
  branch text not null,
  details jsonb,
  created_at timestamptz default now()
);

alter table public.health_safety_items enable row level security;

drop policy if exists "owner_select_own_health_safety_items" on public.health_safety_items;
drop policy if exists "owner_insert_own_health_safety_items" on public.health_safety_items;
drop policy if exists "owner_update_own_health_safety_items" on public.health_safety_items;
drop policy if exists "owner_delete_own_health_safety_items" on public.health_safety_items;

create policy "owner_select_own_health_safety_items"
on public.health_safety_items
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = health_safety_items.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_health_safety_items"
on public.health_safety_items
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = health_safety_items.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_health_safety_items"
on public.health_safety_items
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = health_safety_items.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = health_safety_items.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_health_safety_items"
on public.health_safety_items
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = health_safety_items.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Profit & Loss statements (stored as JSON payload)
create table if not exists public.pnl_statements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  scope text not null default 'agency',
  year integer not null,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (agency_id, scope, year)
);

alter table public.pnl_statements enable row level security;

drop policy if exists "owner_select_own_pnl_statements" on public.pnl_statements;
drop policy if exists "owner_insert_own_pnl_statements" on public.pnl_statements;
drop policy if exists "owner_update_own_pnl_statements" on public.pnl_statements;
drop policy if exists "owner_delete_own_pnl_statements" on public.pnl_statements;

create policy "owner_select_own_pnl_statements"
on public.pnl_statements
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = pnl_statements.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_pnl_statements"
on public.pnl_statements
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = pnl_statements.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_pnl_statements"
on public.pnl_statements
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = pnl_statements.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = pnl_statements.agency_id
      and a.owner_user_id = auth.uid()
  )
);

  create policy "owner_delete_own_pnl_statements"
  on public.pnl_statements
  for delete
  using (
    exists (
      select 1 from public.agencies a
      where a.id = pnl_statements.agency_id
        and a.owner_user_id = auth.uid()
    )
  );

  -- Client/branch-staff access to P&L statements (scoped by agency via clients/client_staff)
  drop policy if exists "client_select_own_pnl_statements" on public.pnl_statements;
  drop policy if exists "client_insert_own_pnl_statements" on public.pnl_statements;
  drop policy if exists "client_update_own_pnl_statements" on public.pnl_statements;
  drop policy if exists "client_delete_own_pnl_statements" on public.pnl_statements;

  create policy "client_select_own_pnl_statements"
  on public.pnl_statements
  for select
  using (
    exists (
      select 1 from public.clients c
      where c.agency_id = pnl_statements.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or c.id::text = auth.jwt() -> 'user_metadata' ->> 'client_id'
          or c.id::text = auth.jwt() -> 'app_metadata' ->> 'client_id'
        )
    )
    or exists (
      select 1
      from public.client_staff cs
      join public.clients c on c.id = cs.client_id
      where c.agency_id = pnl_statements.agency_id
        and lower(cs.email) = lower(auth.jwt() ->> 'email')
    )
  );

  create policy "client_insert_own_pnl_statements"
  on public.pnl_statements
  for insert
  with check (
    exists (
      select 1 from public.clients c
      where c.agency_id = pnl_statements.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or c.id::text = auth.jwt() -> 'user_metadata' ->> 'client_id'
          or c.id::text = auth.jwt() -> 'app_metadata' ->> 'client_id'
        )
    )
    or exists (
      select 1
      from public.client_staff cs
      join public.clients c on c.id = cs.client_id
      where c.agency_id = pnl_statements.agency_id
        and lower(cs.email) = lower(auth.jwt() ->> 'email')
    )
  );

  create policy "client_update_own_pnl_statements"
  on public.pnl_statements
  for update
  using (
    exists (
      select 1 from public.clients c
      where c.agency_id = pnl_statements.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or c.id::text = auth.jwt() -> 'user_metadata' ->> 'client_id'
          or c.id::text = auth.jwt() -> 'app_metadata' ->> 'client_id'
        )
    )
    or exists (
      select 1
      from public.client_staff cs
      join public.clients c on c.id = cs.client_id
      where c.agency_id = pnl_statements.agency_id
        and lower(cs.email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.agency_id = pnl_statements.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or c.id::text = auth.jwt() -> 'user_metadata' ->> 'client_id'
          or c.id::text = auth.jwt() -> 'app_metadata' ->> 'client_id'
        )
    )
    or exists (
      select 1
      from public.client_staff cs
      join public.clients c on c.id = cs.client_id
      where c.agency_id = pnl_statements.agency_id
        and lower(cs.email) = lower(auth.jwt() ->> 'email')
    )
  );

  create policy "client_delete_own_pnl_statements"
  on public.pnl_statements
  for delete
  using (
    exists (
      select 1 from public.clients c
      where c.agency_id = pnl_statements.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or c.id::text = auth.jwt() -> 'user_metadata' ->> 'client_id'
          or c.id::text = auth.jwt() -> 'app_metadata' ->> 'client_id'
        )
    )
    or exists (
      select 1
      from public.client_staff cs
      join public.clients c on c.id = cs.client_id
      where c.agency_id = pnl_statements.agency_id
        and lower(cs.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- =============================================
-- Week 2 - additional fields for branches + invitations
-- =============================================

-- Branch status + enabled modules
alter table public.branches add column if not exists status text not null default 'active';
alter table public.branches add column if not exists enabled_modules jsonb;

do $$
begin
  alter table public.branches
    add constraint branches_status_check check (status in ('active','inactive'));
exception
  when duplicate_object then null;
end $$;

-- Invitations improvements (metadata + accepted tracking)
alter table public.invitations add column if not exists metadata jsonb;
alter table public.invitations add column if not exists last_sent_at timestamptz;
alter table public.invitations add column if not exists sent_count integer not null default 0;
alter table public.invitations add column if not exists accepted_at timestamptz;
alter table public.invitations add column if not exists accepted_user_id uuid references auth.users(id) on delete set null;

-- Enable RLS on invitations
alter table public.invitations enable row level security;

drop policy if exists "owner_select_own_invitations" on public.invitations;
drop policy if exists "owner_insert_own_invitations" on public.invitations;
drop policy if exists "owner_update_own_invitations" on public.invitations;
drop policy if exists "owner_delete_own_invitations" on public.invitations;
drop policy if exists "invitee_select_own_invitations_by_email" on public.invitations;
drop policy if exists "invitee_update_own_invitations_by_email" on public.invitations;

create policy "owner_select_own_invitations"
on public.invitations
for select
using (
  invitations.agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = invitations.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_invitations"
on public.invitations
for insert
with check (
  invitations.agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = invitations.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_invitations"
on public.invitations
for update
using (
  invitations.agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = invitations.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  invitations.agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = invitations.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_invitations"
on public.invitations
for delete
using (
  invitations.agency_id is not null
  and exists (
    select 1 from public.agencies a
    where a.id = invitations.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Invitees can see their own invitation row by email (used to sync role/metadata on login)
create policy "invitee_select_own_invitations_by_email"
on public.invitations
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Invitees can mark their own invitation as accepted
create policy "invitee_update_own_invitations_by_email"
on public.invitations
for update
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email') and status = 'pending')
with check (lower(email) = lower(auth.jwt() ->> 'email') and status = 'accepted');

-- =====================================================
-- Movements (agency-scoped) + related notes and offers
-- =====================================================

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  property text,
  address text,
  type text, -- 'sale' | 'letting'
  status text,
  price numeric,
  fee_amount numeric,
  fee_percentage numeric,
  date date,
  agent text,
  board boolean,
  viewing_arrangements text,
  viewing_notes text,
  notes text,
  motivated_seller text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists movements_agency_date_idx on public.movements (agency_id, date desc);

alter table public.movements enable row level security;

drop policy if exists "movements_agency_access" on public.movements;
create policy "movements_agency_access"
on public.movements
for all
using (exists (
  select 1 from public.agency_admins aa
  where aa.agency_id = movements.agency_id
    and aa.user_id = auth.uid()
));

create table if not exists public.movement_notes (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.movements(id) on delete cascade,
  content text not null,
  created_by text,
  created_at timestamptz default now()
);

alter table public.movement_notes enable row level security;
drop policy if exists "movement_notes_agency_access" on public.movement_notes;
create policy "movement_notes_agency_access"
on public.movement_notes
for all
using (exists (
  select 1
  from public.movements m
  join public.agency_admins aa on aa.agency_id = m.agency_id and aa.user_id = auth.uid()
  where m.id = movement_notes.movement_id
));

create table if not exists public.movement_offers (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.movements(id) on delete cascade,
  amount numeric,
  buyer text,
  status text,
  submitted_date timestamptz,
  notes text,
  created_at timestamptz default now()
);

alter table public.movement_offers enable row level security;
drop policy if exists "movement_offers_agency_access" on public.movement_offers;
create policy "movement_offers_agency_access"
on public.movement_offers
for all
using (exists (
  select 1
  from public.movements m
  join public.agency_admins aa on aa.agency_id = m.agency_id and aa.user_id = auth.uid()
  where m.id = movement_offers.movement_id
));

-- =====================
-- Prospects (agency)
-- =====================

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  date date,
  stage text,
  address text,
  prospector text,
  notes text,
  price_est numeric,
  type text, -- 'for-sale' | 'to-let'
  hot_cold text,
  movement_booked boolean default false,
  linked_movement_id uuid references public.movements(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists prospects_agency_date_idx on public.prospects (agency_id, date desc);

alter table public.prospects enable row level security;
drop policy if exists "prospects_agency_access" on public.prospects;
create policy "prospects_agency_access"
on public.prospects
for all
using (exists (
  select 1 from public.agency_admins aa
  where aa.agency_id = prospects.agency_id
    and aa.user_id = auth.uid()
));

-- =====================
-- Reports
-- =====================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text not null check (type in ('sales', 'financial', 'performance', 'custom')),
  description text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly')),
  recipients text[] default array[]::text[],
  status text not null check (status in ('scheduled', 'generating', 'ready')),
  last_generated timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists reports_client_id_idx on public.reports (client_id);
create index if not exists reports_created_at_idx on public.reports (created_at desc);

alter table public.reports enable row level security;
drop policy if exists "reports_client_access_select" on public.reports;
drop policy if exists "reports_client_access_insert" on public.reports;
drop policy if exists "reports_client_access_update" on public.reports;
drop policy if exists "reports_client_access_delete" on public.reports;

create policy "reports_client_access_select"
on public.reports
for select
using (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);

create policy "reports_client_access_insert"
on public.reports
for insert
with check (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);

create policy "reports_client_access_update"
on public.reports
for update
using (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);

create policy "reports_client_access_delete"
on public.reports
for delete
using (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);
