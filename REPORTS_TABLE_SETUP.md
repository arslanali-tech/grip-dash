# Reports Table Setup Guide

## Overview
The Reports feature requires a `reports` table in your Supabase database to persist report data. This guide explains how to create and configure this table.

## Table Creation Methods

### Method 1: Using the Migration File (Recommended)
If you're using Supabase CLI:

```bash
supabase migration up --local
# or
supabase db push
```

The migration file is located at: `supabase/migrations/add_reports_table.sql`

### Method 2: Manual SQL in Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL directly from `supabase_schema_week2.sql` (reports section at the end)

### Method 3: Create Manually in Supabase Dashboard

1. **Create Table**: Open Supabase dashboard → SQL Editor → Create empty table:
   - Table name: `reports`
   - Add columns:
     - `id` (UUID, Primary Key, default: `gen_random_uuid()`)
     - `client_id` (UUID, Foreign Key → clients(id), Required)
     - `name` (Text, Required)
     - `type` (Text, Required, Check: 'sales' | 'financial' | 'performance' | 'custom')
     - `description` (Text)
     - `frequency` (Text, Required, Check: 'daily' | 'weekly' | 'monthly' | 'quarterly')
     - `recipients` (Text Array, default: array[])
     - `status` (Text, Required, Check: 'scheduled' | 'generating' | 'ready')
     - `last_generated` (Timestamptz)
     - `created_at` (Timestamptz, default: now())
     - `updated_at` (Timestamptz, default: now())

2. **Create Indexes**:
   ```sql
   create index reports_client_id_idx on public.reports (client_id);
   create index reports_created_at_idx on public.reports (created_at desc);
   ```

3. **Enable RLS**:
   - Select table → Authentication → Enable RLS

4. **Create Policies**:
   Copy all four policies from the migration file to your SQL Editor

## RLS Policies Required

The table requires four Row-Level Security policies to function correctly:

### 1. `reports_client_access_select`
**Purpose**: Allow clients to select only their own reports
```sql
create policy "reports_client_access_select"
on public.reports
for select
using (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);
```

### 2. `reports_client_access_insert`
**Purpose**: Allow clients to insert reports for their own client_id
```sql
create policy "reports_client_access_insert"
on public.reports
for insert
with check (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);
```

### 3. `reports_client_access_update`
**Purpose**: Allow clients to update their own reports
```sql
create policy "reports_client_access_update"
on public.reports
for update
using (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);
```

### 4. `reports_client_access_delete`
**Purpose**: Allow clients to delete their own reports
```sql
create policy "reports_client_access_delete"
on public.reports
for delete
using (
  client_id::text = auth.jwt() ->> 'client_id'
  or exists (
    select 1 from public.clients c
    where c.id = reports.client_id
      and lower(c.email) = lower(auth.jwt() ->> 'email')
  )
);
```

## Troubleshooting

### "Reports table does not exist"
- The table wasn't created in Supabase
- **Solution**: Run the migration file or create the table manually using Method 1, 2, or 3 above

### "Permission denied" when creating reports
- RLS policies are not configured correctly or are too restrictive
- **Common issues**:
  - `client_id` in JWT token doesn't match the table's `client_id` column
  - The JWT token doesn't contain a `client_id` claim
  - Policies are checking the wrong column references
- **Solution**: Verify RLS policies match the schema exactly. Check that Supabase JWT includes the `client_id` claim.

### "Client ID not found" message appears
- The application can't determine which client is accessing the reports
- **Cause**: `useDashboardStore().clientId` is null or undefined
- **Solution**: 
  1. Verify you are logged in as a client (not an owner/admin)
  2. Check that the clients table has a matching record with your email
  3. Ensure authentication is working correctly

### Reports won't save but no error message
- Silent failure, likely due to RLS policy blocking the write
- **Solution**:
  1. Open browser DevTools → Console
  2. Look for error messages from Supabase
  3. Verify the RLS policies are correctly set up
  4. Check that your client_id matches the JWT token

### Can create reports but they don't appear when page refreshes
- Reports are stored locally but not persisting to database
- **Causes**:
  1. createReport() returned null silently (check console logs)
  2. RLS policy allowed INSERT but the confirmation returned empty
  3. Database error that wasn't displayed
- **Solution**:
  1. Check browser console for detailed error logs
  2. Verify RLS policies are returning data after INSERT
  3. Test the Supabase API directly via the dashboard

## Testing

To verify the setup is correct:

1. **Test in Supabase Dashboard**:
   - SQL Editor → Test INSERT:
     ```sql
     insert into public.reports (
       client_id,
       name,
       type,
       description,
       frequency,
       recipients,
       status,
       last_generated
     ) values (
       'YOUR_CLIENT_ID_UUID',
       'Test Report',
       'sales',
       'Test description',
       'monthly',
       array['email@example.com'],
       'ready',
       now()
     )
     returning *;
     ```

2. **Test in the Application**:
   - Navigate to Business Analytics → Reporting
   - Click "Create Report"
   - Fill in the form
   - Watch browser console for detailed logs
   - Check if error message appears or report is created

## Code References

- **ReportingView.tsx**: Main component for report creation/management
- **ownerApi.ts**: Database API functions (createReport, getReports, updateReport, deleteReport)
- **Error Handling**: Improved error messages indicate specific issues (table missing, permission denied, etc.)

## Dependencies

- **Supabase PostgreSQL**: For table storage and RLS
- **React State**: For local report management and UI updates
- **useDashboardStore**: Provides `clientId` for filtering database queries

## Migration Files

- **Location**: `supabase/migrations/add_reports_table.sql`
- **Includes**: Table creation, indexes, RLS setup
- **Timestamp Compatible**: Follows Supabase migration naming convention
