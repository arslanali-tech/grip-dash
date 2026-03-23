-- Migration: Add chat attachments support and ensure property_referrals table exists
-- Run this migration to enable file uploads in team chat and fix referrals

-- =============================
-- 1. Ensure property_referrals table exists (idempotent)
-- =============================

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

-- Owner policies (idempotent with drop if exists)
drop policy if exists "owner_select_own_property_referrals" on public.property_referrals;
drop policy if exists "owner_insert_own_property_referrals" on public.property_referrals;
drop policy if exists "owner_update_own_property_referrals" on public.property_referrals;
drop policy if exists "owner_delete_own_property_referrals" on public.property_referrals;

create policy "owner_select_own_property_referrals"
on public.property_referrals for select
using (exists (
  select 1 from public.agencies a
  where a.id = property_referrals.agency_id and a.owner_user_id = auth.uid()
));

create policy "owner_insert_own_property_referrals"
on public.property_referrals for insert
with check (exists (
  select 1 from public.agencies a
  where a.id = property_referrals.agency_id and a.owner_user_id = auth.uid()
));

create policy "owner_update_own_property_referrals"
on public.property_referrals for update
using (exists (
  select 1 from public.agencies a
  where a.id = property_referrals.agency_id and a.owner_user_id = auth.uid()
))
with check (exists (
  select 1 from public.agencies a
  where a.id = property_referrals.agency_id and a.owner_user_id = auth.uid()
));

create policy "owner_delete_own_property_referrals"
on public.property_referrals for delete
using (exists (
  select 1 from public.agencies a
  where a.id = property_referrals.agency_id and a.owner_user_id = auth.uid()
));

-- Client/Branch manager policies
drop policy if exists "client_or_branch_manager_select_property_referrals" on public.property_referrals;
drop policy if exists "client_or_branch_manager_insert_property_referrals" on public.property_referrals;
drop policy if exists "client_or_branch_manager_update_property_referrals" on public.property_referrals;
drop policy if exists "client_or_branch_manager_delete_property_referrals" on public.property_referrals;

create policy "client_or_branch_manager_select_property_referrals"
on public.property_referrals for select
using (exists (
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
));

create policy "client_or_branch_manager_insert_property_referrals"
on public.property_referrals for insert
with check (exists (
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
));

create policy "client_or_branch_manager_update_property_referrals"
on public.property_referrals for update
using (exists (
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
))
with check (exists (
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
));

create policy "client_or_branch_manager_delete_property_referrals"
on public.property_referrals for delete
using (exists (
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
));

-- =============================
-- 2. Add attachment columns to team_messages (idempotent)
-- =============================

do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_messages' 
    and column_name = 'attachment_url') then
    alter table public.team_messages add column attachment_url text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_messages' 
    and column_name = 'attachment_name') then
    alter table public.team_messages add column attachment_name text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_messages' 
    and column_name = 'attachment_type') then
    alter table public.team_messages add column attachment_type text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_messages' 
    and column_name = 'attachment_size') then
    alter table public.team_messages add column attachment_size bigint;
  end if;
end $$;

-- =============================
-- 3. Add attachment columns to team_direct_messages (idempotent)
-- =============================

do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_direct_messages' 
    and column_name = 'attachment_url') then
    alter table public.team_direct_messages add column attachment_url text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_direct_messages' 
    and column_name = 'attachment_name') then
    alter table public.team_direct_messages add column attachment_name text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_direct_messages' 
    and column_name = 'attachment_type') then
    alter table public.team_direct_messages add column attachment_type text;
  end if;
  
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'team_direct_messages' 
    and column_name = 'attachment_size') then
    alter table public.team_direct_messages add column attachment_size bigint;
  end if;
end $$;

-- =============================
-- 4. Create storage bucket for chat attachments (run via Supabase dashboard or CLI)
-- =============================
-- Note: Storage bucket creation should be done via Supabase Dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket named 'chat-attachments'
-- 3. Set it to public (or configure appropriate policies)

-- Alternative: If using Supabase CLI, you can create the bucket with:
-- insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', true)
-- on conflict (id) do nothing;

-- Storage policies for chat-attachments bucket (run these after creating the bucket)
-- These allow authenticated users to upload and read files

-- drop policy if exists "Allow authenticated uploads" on storage.objects;
-- create policy "Allow authenticated uploads"
-- on storage.objects for insert
-- with check (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');

-- drop policy if exists "Allow public reads" on storage.objects;
-- create policy "Allow public reads"
-- on storage.objects for select
-- using (bucket_id = 'chat-attachments');

-- drop policy if exists "Allow owner deletes" on storage.objects;
-- create policy "Allow owner deletes"
-- on storage.objects for delete
-- using (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
