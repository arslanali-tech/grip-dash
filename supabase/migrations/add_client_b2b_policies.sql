-- Allow client users to manage their own B2B companies
-- Clients are matched by email or client_id in JWT

-- Select: clients can view their own B2B companies
drop policy if exists "client_select_own_b2b_companies" on public.b2b_companies;
create policy "client_select_own_b2b_companies"
on public.b2b_companies
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Insert: clients can create B2B companies for their own agency
drop policy if exists "client_insert_own_b2b_companies" on public.b2b_companies;
create policy "client_insert_own_b2b_companies"
on public.b2b_companies
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Update: clients can update their own B2B companies
drop policy if exists "client_update_own_b2b_companies" on public.b2b_companies;
create policy "client_update_own_b2b_companies"
on public.b2b_companies
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Delete: clients can delete their own B2B companies
drop policy if exists "client_delete_own_b2b_companies" on public.b2b_companies;
create policy "client_delete_own_b2b_companies"
on public.b2b_companies
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);
