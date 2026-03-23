# Fix Branch Manager 403 Error

## Problem
Branch managers get a 403 (Forbidden) error when trying to create staff because the Row Level Security (RLS) policies don't recognize them.

**Error Message:**
```
Failed to load resource: the server responded with a status of 403
Error creating client staff
```

## Root Cause
The existing RLS policies check for:
- Client email matching: `lower(c.email) = lower(auth.jwt() ->> 'email')`
- Client ID in JWT root: `c.id::text = (auth.jwt() ->> 'client_id')`

**But branch managers** have `client_id` in `user_metadata`, not at the root JWT level:
```json
{
  "user_metadata": {
    "role": "branch_manager",
    "client_id": "uuid-here",
    "branch_id": "uuid-here",
    "branch": "Central London"
  }
}
```

## Solution
Apply the SQL migration that adds support for branch managers in RLS policies.

## How to Apply the Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the Migration**
   - Open `supabase/migrations/add_branch_manager_staff_policies.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" or press `Ctrl+Enter`
   - Wait for success message
   - You should see: "Success. No rows returned"

5. **Verify**
   - Go back to your app
   - Login as branch manager
   - Try creating staff - should work now! ✅

### Option 2: Via Supabase CLI (If you have it installed)

```bash
# Make sure you're in the project directory
cd D:\a\grip_dashboard_real_1_2g4ufg

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

### Option 3: Manual SQL Execution

If you prefer to run the SQL manually, here's the complete script:

```sql
-- Add RLS policies for branch managers to manage staff in their branch

-- Drop existing client staff policies
drop policy if exists "client_select_own_client_staff" on public.client_staff;
drop policy if exists "client_insert_own_client_staff" on public.client_staff;
drop policy if exists "client_update_own_client_staff" on public.client_staff;
drop policy if exists "client_delete_own_client_staff" on public.client_staff;

-- Helper function to check if user is a branch manager for a specific client
create or replace function is_branch_manager_for_client(target_client_id uuid)
returns boolean as $$
begin
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
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = (auth.jwt() ->> 'client_id')
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
```

## What This Migration Does

1. **Creates Helper Function** (`is_branch_manager_for_client`)
   - Checks if the logged-in user is a branch manager for a specific client
   - Reads from `user_metadata` in the JWT token
   - Returns `true` if role is 'branch_manager' AND client_id matches

2. **Updates RLS Policies**
   - **SELECT**: Branch managers can view staff for their client
   - **INSERT**: Branch managers can create staff for their client
   - **UPDATE**: Branch managers can update staff for their client
   - **DELETE**: Branch managers can delete staff for their client

3. **Updates Branch Policies**
   - Branch managers can read branches for their client (needed for the dropdown)

## Verification Steps

After applying the migration:

1. **Check Function Creation**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'is_branch_manager_for_client';
   ```
   Should return 1 row ✅

2. **Check RLS Policies**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'client_staff';
   ```
   Should show the new policies with "branch_manager" in names ✅

3. **Test as Branch Manager**
   - Login as branch manager
   - Navigate to Branch Management → Staff
   - Click "Add Staff Member"
   - Fill form and submit
   - Should create successfully without 403 error ✅

## Troubleshooting

### Still Getting 403 Error?

**Check user metadata:**
```sql
SELECT 
  email,
  raw_user_meta_data->'role' as role,
  raw_user_meta_data->'client_id' as client_id,
  raw_user_meta_data->'branch_id' as branch_id
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'branch_manager';
```

**Verify the function works:**
```sql
-- Replace with your branch manager's client_id
SELECT is_branch_manager_for_client('your-client-uuid-here'::uuid);
```
Should return `true` when logged in as that branch manager.

**Check if policies are active:**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'client_staff' 
AND policyname LIKE '%branch_manager%';
```

### Migration Failed?

If you get errors during migration:

1. **"policy already exists"** - Run the `drop policy` statements first
2. **"function already exists"** - Use `create or replace function`
3. **"permission denied"** - Make sure you're connected as the database owner

## After Migration

Once the migration is applied successfully:

- ✅ Branch managers can create staff
- ✅ Branch managers can edit staff
- ✅ Branch managers can delete staff
- ✅ Branch managers can view all staff in their branch
- ✅ Staff creation sends invitation emails
- ✅ Data is properly scoped to branch manager's branch

## Support

If you continue to have issues:

1. Check Supabase logs: Dashboard → Logs → API Logs
2. Verify user metadata in auth.users table
3. Test the helper function manually
4. Ensure JWT contains user_metadata (refresh login after changes)
