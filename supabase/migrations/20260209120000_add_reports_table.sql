-- Create reports table for business analytics reporting
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

-- Create index for faster lookups
create index if not exists reports_client_id_idx on public.reports (client_id);
create index if not exists reports_created_at_idx on public.reports (created_at desc);

-- Enable RLS on reports table
alter table public.reports enable row level security;

-- Drop existing policies if they exist
drop policy if exists "reports_client_access_select" on public.reports;
drop policy if exists "reports_client_access_insert" on public.reports;
drop policy if exists "reports_client_access_update" on public.reports;
drop policy if exists "reports_client_access_delete" on public.reports;

-- Allow clients to select their own reports
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

-- Allow clients to insert reports for their own client_id
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

-- Allow clients to update their own reports
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

-- Allow clients to delete their own reports
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
