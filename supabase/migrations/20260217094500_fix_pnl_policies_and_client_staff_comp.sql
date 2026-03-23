-- Add compensation fields to client_staff (if missing)
alter table public.client_staff add column if not exists basic_wage numeric;
alter table public.client_staff add column if not exists employer_nics numeric;
alter table public.client_staff add column if not exists employer_pension numeric;
alter table public.client_staff add column if not exists holiday_allowance integer default 28;
alter table public.client_staff add column if not exists commission_breakdown jsonb;

-- Recreate client/branch-staff policies for pnl_statements (avoid referencing non-existent columns)
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
