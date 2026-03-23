-- Allow client users to manage their own health & safety items
-- Clients are matched by email or client_id in JWT

-- Select: clients can view health & safety items for their agency
drop policy if exists "client_select_own_health_safety_items" on public.health_safety_items;
create policy "client_select_own_health_safety_items"
on public.health_safety_items
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Insert: clients can create health & safety items for their own agency
drop policy if exists "client_insert_own_health_safety_items" on public.health_safety_items;
create policy "client_insert_own_health_safety_items"
on public.health_safety_items
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Update: clients can update health & safety items for their own agency
drop policy if exists "client_update_own_health_safety_items" on public.health_safety_items;
create policy "client_update_own_health_safety_items"
on public.health_safety_items
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);

-- Delete: clients can delete health & safety items for their own agency
drop policy if exists "client_delete_own_health_safety_items" on public.health_safety_items;
create policy "client_delete_own_health_safety_items"
on public.health_safety_items
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = health_safety_items.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
      )
  )
);
