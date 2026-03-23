-- Add RLS policies for branch managers to manage staff in their branch
-- Branch managers need to be able to create, read, update, and delete staff for their assigned branch

-- Drop existing client staff policies to recreate them with branch manager support
drop policy if exists "client_select_own_client_staff" on public.client_staff;
drop policy if exists "client_insert_own_client_staff" on public.client_staff;
drop policy if exists "client_update_own_client_staff" on public.client_staff;
drop policy if exists "client_delete_own_client_staff" on public.client_staff;

-- Helper function to check if user is a branch manager for a specific client
-- This checks user_metadata for client_id
create or replace function is_branch_manager_for_client(target_client_id uuid)
returns boolean as $$
begin
  -- Check if user's metadata contains the target client_id
  return (auth.jwt() -> 'user_metadata' ->> 'client_id')::text = target_client_id::text
    and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager';
end;
$$ language plpgsql security definer;

-- SELECT: Allow clients AND branch managers to view staff
create policy "client_and_branch_manager_select_client_staff"
on public.client_staff
for select
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        -- Client user (matched by email or client_id in JWT)
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        -- Branch manager (matched by client_id in user_metadata)
        or is_branch_manager_for_client(c.id)
      )
  )
);

-- INSERT: Allow clients AND branch managers to create staff
create policy "client_and_branch_manager_insert_client_staff"
on public.client_staff
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        -- Client user
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        -- Branch manager
        or is_branch_manager_for_client(c.id)
      )
  )
  and (
    client_staff.branch_id is null
    or exists (
      select 1 from public.client_branches cb
      where cb.id = client_staff.branch_id
        and cb.client_id = client_staff.client_id
    )
  )
);

-- UPDATE: Allow clients AND branch managers to update staff
create policy "client_and_branch_manager_update_client_staff"
on public.client_staff
for update
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
  and (
    client_staff.branch_id is null
    or exists (
      select 1 from public.client_branches cb
      where cb.id = client_staff.branch_id
        and cb.client_id = client_staff.client_id
    )
  )
);

-- DELETE: Allow clients AND branch managers to delete staff
create policy "client_and_branch_manager_delete_client_staff"
on public.client_staff
for delete
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
);

-- Also update client_branches policies to allow branch managers to read branches
drop policy if exists "client_select_own_client_branches" on public.client_branches;

create policy "client_and_branch_manager_select_client_branches"
on public.client_branches
for select
using (
  exists (
    select 1 from public.clients c
    where c.id = client_branches.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
);

-- Keep other client_branches policies unchanged (only clients/owners can insert/update/delete branches)
