-- Client staff roles: reusable role templates for client_staff (role name + enabled modules)

create table if not exists public.client_staff_roles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  enabled_modules jsonb,
  created_at timestamptz default now()
);

-- Ensure role names are unique per client
-- (case-sensitive; keep UI normalized to avoid duplicates)
do $$
begin
  alter table public.client_staff_roles
    add constraint client_staff_roles_client_id_name_unique unique (client_id, name);
exception
  when duplicate_object then null;
end $$;

create index if not exists client_staff_roles_client_id_idx on public.client_staff_roles (client_id);

alter table public.client_staff_roles enable row level security;

-- Helper function (shared with other branch-manager policies)
create or replace function public.is_branch_manager_for_client(target_client_id uuid)
returns boolean as $$
begin
  return (auth.jwt() -> 'user_metadata' ->> 'client_id')::text = target_client_id::text
    and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager';
end;
$$ language plpgsql security definer;

-- =============================
-- Owner policies (GRIP owner managing clients via agencies)
-- =============================

drop policy if exists "owner_select_own_client_staff_roles" on public.client_staff_roles;
drop policy if exists "owner_insert_own_client_staff_roles" on public.client_staff_roles;
drop policy if exists "owner_update_own_client_staff_roles" on public.client_staff_roles;
drop policy if exists "owner_delete_own_client_staff_roles" on public.client_staff_roles;

create policy "owner_select_own_client_staff_roles"
on public.client_staff_roles
for select
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff_roles.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_client_staff_roles"
on public.client_staff_roles
for insert
with check (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff_roles.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_client_staff_roles"
on public.client_staff_roles
for update
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff_roles.client_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff_roles.client_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_client_staff_roles"
on public.client_staff_roles
for delete
using (
  exists (
    select 1
    from public.clients c
    join public.agencies a on a.id = c.agency_id
    where c.id = client_staff_roles.client_id
      and a.owner_user_id = auth.uid()
  )
);

-- =============================
-- Client + Branch manager policies (per client)
-- =============================

drop policy if exists "client_and_branch_manager_select_client_staff_roles" on public.client_staff_roles;
drop policy if exists "client_and_branch_manager_insert_client_staff_roles" on public.client_staff_roles;
drop policy if exists "client_and_branch_manager_update_client_staff_roles" on public.client_staff_roles;
drop policy if exists "client_and_branch_manager_delete_client_staff_roles" on public.client_staff_roles;

create policy "client_and_branch_manager_select_client_staff_roles"
on public.client_staff_roles
for select
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff_roles.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
);

create policy "client_and_branch_manager_insert_client_staff_roles"
on public.client_staff_roles
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_staff_roles.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
);

create policy "client_and_branch_manager_update_client_staff_roles"
on public.client_staff_roles
for update
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff_roles.client_id
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
    where c.id = client_staff_roles.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
);

create policy "client_and_branch_manager_delete_client_staff_roles"
on public.client_staff_roles
for delete
using (
  exists (
    select 1 from public.clients c
    where c.id = client_staff_roles.client_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
        or is_branch_manager_for_client(c.id)
      )
  )
);
