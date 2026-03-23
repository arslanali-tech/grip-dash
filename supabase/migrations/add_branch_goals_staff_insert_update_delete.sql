-- Allow staff (branch_manager, negotiator, prospector) and agency owners to insert, update, delete branch_goals.

drop policy if exists "staff_insert_branch_goals" on public.branch_goals;
drop policy if exists "staff_update_branch_goals" on public.branch_goals;
drop policy if exists "staff_delete_branch_goals" on public.branch_goals;
drop policy if exists "owner_select_branch_goals" on public.branch_goals;
drop policy if exists "owner_insert_branch_goals" on public.branch_goals;
drop policy if exists "owner_update_branch_goals" on public.branch_goals;
drop policy if exists "owner_delete_branch_goals" on public.branch_goals;

-- Agency owner (GRIP owner) can read and manage goals for their agency
create policy "owner_select_branch_goals"
on public.branch_goals
for select
using (
  exists (select 1 from public.agencies a where a.id = branch_goals.agency_id and a.owner_user_id = auth.uid())
);
create policy "owner_insert_branch_goals"
on public.branch_goals
for insert
with check (
  exists (select 1 from public.agencies a where a.id = branch_goals.agency_id and a.owner_user_id = auth.uid())
);
create policy "owner_update_branch_goals"
on public.branch_goals
for update
using (
  exists (select 1 from public.agencies a where a.id = branch_goals.agency_id and a.owner_user_id = auth.uid())
)
with check (
  exists (select 1 from public.agencies a where a.id = branch_goals.agency_id and a.owner_user_id = auth.uid())
);
create policy "owner_delete_branch_goals"
on public.branch_goals
for delete
using (
  exists (select 1 from public.agencies a where a.id = branch_goals.agency_id and a.owner_user_id = auth.uid())
);

create policy "staff_insert_branch_goals"
on public.branch_goals
for insert
with check (
  (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager', 'negotiator', 'prospector')
  and exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
  )
);

create policy "staff_update_branch_goals"
on public.branch_goals
for update
using (
  (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager', 'negotiator', 'prospector')
  and exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
  )
)
with check (
  (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager', 'negotiator', 'prospector')
  and exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
  )
);

create policy "staff_delete_branch_goals"
on public.branch_goals
for delete
using (
  (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager', 'negotiator', 'prospector')
  and exists (
    select 1
    from public.clients c
    where c.agency_id = branch_goals.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
  )
);
