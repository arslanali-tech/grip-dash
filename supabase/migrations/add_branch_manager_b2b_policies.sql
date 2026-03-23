-- Allow clients and branch managers to manage B2B companies and referrals
-- Clients matched by email or client_id in JWT
-- Branch managers matched by client_id + role in user_metadata

-- =============================
-- B2B companies
-- =============================

drop policy if exists "client_select_own_b2b_companies" on public.b2b_companies;
drop policy if exists "client_insert_own_b2b_companies" on public.b2b_companies;
drop policy if exists "client_update_own_b2b_companies" on public.b2b_companies;
drop policy if exists "client_delete_own_b2b_companies" on public.b2b_companies;
drop policy if exists "client_or_branch_manager_select_b2b_companies" on public.b2b_companies;
drop policy if exists "client_or_branch_manager_insert_b2b_companies" on public.b2b_companies;
drop policy if exists "client_or_branch_manager_update_b2b_companies" on public.b2b_companies;
drop policy if exists "client_or_branch_manager_delete_b2b_companies" on public.b2b_companies;

create policy "client_or_branch_manager_select_b2b_companies"
on public.b2b_companies
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
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

create policy "client_or_branch_manager_insert_b2b_companies"
on public.b2b_companies
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
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

create policy "client_or_branch_manager_update_b2b_companies"
on public.b2b_companies
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
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
    where c.agency_id = b2b_companies.agency_id
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

create policy "client_or_branch_manager_delete_b2b_companies"
on public.b2b_companies
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_companies.agency_id
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
-- B2B referrals
-- =============================

drop policy if exists "client_select_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_insert_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_update_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_delete_own_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_or_branch_manager_select_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_or_branch_manager_insert_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_or_branch_manager_update_b2b_referrals" on public.b2b_referrals;
drop policy if exists "client_or_branch_manager_delete_b2b_referrals" on public.b2b_referrals;

create policy "client_or_branch_manager_select_b2b_referrals"
on public.b2b_referrals
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_referrals.agency_id
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

create policy "client_or_branch_manager_insert_b2b_referrals"
on public.b2b_referrals
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_referrals.agency_id
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

create policy "client_or_branch_manager_update_b2b_referrals"
on public.b2b_referrals
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_referrals.agency_id
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
    where c.agency_id = b2b_referrals.agency_id
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

create policy "client_or_branch_manager_delete_b2b_referrals"
on public.b2b_referrals
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = b2b_referrals.agency_id
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
