# Fix: 403 Error When Creating B2B Companies

## Problem
Client users get `403 Forbidden` when trying to create B2B companies because only owner RLS policies exist.

## Solution
Add client-specific RLS policies to allow clients to manage their own B2B companies.

## Steps to Apply

### 1. Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr/sql

### 2. Create New Query
Click **"New Query"** button

### 3. Copy and Paste This SQL

```sql
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
```

### 4. Run the Query
Click **"Run"** button (or press Ctrl+Enter)

### 5. Verify
You should see:
```
Success. No rows returned
```

### 6. Test in Your App
Refresh your browser and try creating a B2B company again.

---

## What This Does

These policies allow client users to:
- **View** B2B companies in their agency
- **Create** new B2B companies in their agency  
- **Update** existing B2B companies in their agency
- **Delete** B2B companies in their agency

The policies match clients by:
1. Email address (case-insensitive)
2. `client_id` in the JWT token
