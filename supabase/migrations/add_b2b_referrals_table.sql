-- Create B2B referrals table and add branch scoping column for companies

-- Ensure branch_id exists on b2b_companies for branch scoping
alter table public.b2b_companies
  add column if not exists branch_id uuid references public.client_branches(id);

-- B2B referrals table
create table if not exists public.b2b_referrals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id),
  company_id uuid not null references public.b2b_companies(id) on delete cascade,
  property_address text not null,
  client_name text not null,
  transaction_type text,
  referral_date date not null,
  status text not null default 'pending',
  commission_amount numeric,
  notes text,
  link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.b2b_referrals enable row level security;

-- Owner policies (agency owner can manage their own B2B referrals)
drop policy if exists "owner_select_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "owner_insert_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "owner_update_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "owner_delete_own_b2b_referrals" on public.b2b_referrals;

create policy "owner_select_own_b2b_referrals"
on public.b2b_referrals
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_b2b_referrals"
on public.b2b_referrals
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_b2b_referrals"
on public.b2b_referrals
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_b2b_referrals"
on public.b2b_referrals
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = b2b_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);
