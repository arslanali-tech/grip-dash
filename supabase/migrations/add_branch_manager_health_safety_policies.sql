-- Add branch_id column (if missing) and allow branch managers to manage health & safety items

alter table public.health_safety_items
  add column if not exists branch_id uuid references public.client_branches(id);

drop policy if exists "branch_manager_select_health_safety_items" on public.health_safety_items;
drop policy if exists "branch_manager_insert_health_safety_items" on public.health_safety_items;
drop policy if exists "branch_manager_update_health_safety_items" on public.health_safety_items;
drop policy if exists "branch_manager_delete_health_safety_items" on public.health_safety_items;

create policy "branch_manager_select_health_safety_items"
on public.health_safety_items
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
);

create policy "branch_manager_insert_health_safety_items"
on public.health_safety_items
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and (
    health_safety_items.branch_id is null
    or exists (
      select 1 from public.client_branches cb
      where cb.id = health_safety_items.branch_id
        and cb.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
    )
  )
);

create policy "branch_manager_update_health_safety_items"
on public.health_safety_items
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and (
    health_safety_items.branch_id is null
    or exists (
      select 1 from public.client_branches cb
      where cb.id = health_safety_items.branch_id
        and cb.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
    )
  )
);

create policy "branch_manager_delete_health_safety_items"
on public.health_safety_items
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
);
