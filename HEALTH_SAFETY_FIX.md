# Fix: Health & Safety Items for Client Users

## Problem
Client users get **403 Forbidden** or "Could not save incident report" errors because only owner RLS policies exist on the `health_safety_items` table.

## Current Status
✅ **The Health & Safety view is already dynamic!**
- Summary cards (Compliant/Pending/Overdue) are computed from database items
- Items are loaded from `health_safety_items` table when `agencyId` is available
- Falls back to mock data when no `agencyId`

❌ **Client users can't create/update items** due to missing RLS policies

---

## Solution: Add Client RLS Policies

### Step 1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr/sql

### Step 2: Create New Query
Click **"New Query"**

### Step 3: Copy and Paste This SQL

```sql
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
```

### Step 4: Run the Query
Click **"Run"** (or press Ctrl+Enter)

### Step 5: Verify
You should see: `Success. No rows returned`

### Step 6: Test in Your App
1. **Refresh your browser**
2. Navigate to: **Business Manager → Health & Safety**
3. Click **"Report Incident"** and try creating an incident report
4. The error should be gone, and the item should save successfully!

---

## What This Does

These policies allow client users to:
- **View** health & safety items in their agency
- **Create** new health & safety items (incident reports, risk assessments, etc.)
- **Update** existing health & safety items
- **Delete** health & safety items in their agency

The policies match clients by:
1. Email address (case-insensitive)
2. `client_id` in the JWT token

---

## Summary Cards are Already Dynamic! ✅

Once you add health & safety items, the summary cards will automatically update:
- **Compliant** count (items with status = 'compliant')
- **Pending** count (items with status = 'pending')
- **Overdue** count (items with status = 'overdue')

The view loads items from the `health_safety_items` table and counts are computed from that data.
