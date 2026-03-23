-- Create property referrals table with branch scoping and RLS policies

create table if not exists public.property_referrals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id),
  property_address text not null,
  property_type text,
  estimated_value numeric,
  referral_type text not null default 'internal',
  direction text not null default 'sent',
  status text not null default 'pending',
  from_branch text,
  to_branch text,
  from_agent text,
  to_agent text,
  external_company text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  referral_date timestamptz not null,
  commission numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.property_referrals enable row level security;

-- Owner policies (agency owner can manage their own referrals)
drop policy if exists "owner_select_own_property_referrals" on public.property_referrals;
drop policy if exists "owner_insert_own_property_referrals" on public.property_referrals;
drop policy if exists "owner_update_own_property_referrals" on public.property_referrals;
drop policy if exists "owner_delete_own_property_referrals" on public.property_referrals;

create policy "owner_select_own_property_referrals"
on public.property_referrals
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = property_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_property_referrals"
on public.property_referrals
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = property_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_property_referrals"
on public.property_referrals
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = property_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = property_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_property_referrals"
on public.property_referrals
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = property_referrals.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Client + branch manager policies
drop policy if exists "client_or_branch_manager_select_property_referrals" on public.property_referrals;
drop policy if exists "client_or_branch_manager_insert_property_referrals" on public.property_referrals;
drop policy if exists "client_or_branch_manager_update_property_referrals" on public.property_referrals;
drop policy if exists "client_or_branch_manager_delete_property_referrals" on public.property_referrals;

create policy "client_or_branch_manager_select_property_referrals"
on public.property_referrals
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = property_referrals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_insert_property_referrals"
on public.property_referrals
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = property_referrals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_update_property_referrals"
on public.property_referrals
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = property_referrals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = property_referrals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_delete_property_referrals"
on public.property_referrals
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = property_referrals.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);
