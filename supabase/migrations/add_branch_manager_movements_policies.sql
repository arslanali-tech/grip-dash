-- Allow clients and branch managers to manage movements and prospects

-- =============================
-- Movements policies
-- =============================
drop policy if exists "client_or_branch_manager_select_movements" on public.movements;
drop policy if exists "client_or_branch_manager_insert_movements" on public.movements;
drop policy if exists "client_or_branch_manager_update_movements" on public.movements;
drop policy if exists "client_or_branch_manager_delete_movements" on public.movements;

create policy "client_or_branch_manager_select_movements"
on public.movements
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = movements.agency_id
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

create policy "client_or_branch_manager_insert_movements"
on public.movements
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = movements.agency_id
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

create policy "client_or_branch_manager_update_movements"
on public.movements
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = movements.agency_id
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
    where c.agency_id = movements.agency_id
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

create policy "client_or_branch_manager_delete_movements"
on public.movements
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = movements.agency_id
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

-- =============================
-- Prospects policies
-- =============================
drop policy if exists "client_or_branch_manager_select_prospects" on public.prospects;
drop policy if exists "client_or_branch_manager_insert_prospects" on public.prospects;
drop policy if exists "client_or_branch_manager_update_prospects" on public.prospects;
drop policy if exists "client_or_branch_manager_delete_prospects" on public.prospects;

create policy "client_or_branch_manager_select_prospects"
on public.prospects
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = prospects.agency_id
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

create policy "client_or_branch_manager_insert_prospects"
on public.prospects
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = prospects.agency_id
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

create policy "client_or_branch_manager_update_prospects"
on public.prospects
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = prospects.agency_id
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
    where c.agency_id = prospects.agency_id
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

create policy "client_or_branch_manager_delete_prospects"
on public.prospects
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = prospects.agency_id
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
