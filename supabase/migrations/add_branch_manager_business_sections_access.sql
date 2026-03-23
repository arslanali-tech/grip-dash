-- =============================================
-- Branch Manager access to agency_business_sections
-- =============================================
-- This allows branch managers to view the Business Manager tabs
-- configuration for their agency (read-only access)

-- Drop existing branch manager policy if it exists
drop policy if exists "branch_manager_select_agency_sections" on public.agency_business_sections;

-- Branch managers can see their agency's Business Manager sections
create policy "branch_manager_select_agency_sections"
on public.agency_business_sections
for select
using (
  exists (
    select 1 
    from auth.users u
    where u.id = auth.uid()
      and (
        -- Check if user is branch manager via app_metadata
        (u.app_metadata->>'role' = 'branch_manager' and u.app_metadata->>'agency_id' = agency_business_sections.agency_id::text)
        or
        -- Check if user is branch manager via user_metadata
        (u.user_metadata->>'role' = 'branch_manager' and u.user_metadata->>'agency_id' = agency_business_sections.agency_id::text)
      )
  )
);

-- Note: Branch managers only get SELECT access.
-- INSERT, UPDATE, DELETE remain owner-only (via existing owner policies).
