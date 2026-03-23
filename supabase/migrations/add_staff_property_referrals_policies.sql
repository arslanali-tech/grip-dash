-- Add RLS policies for client_staff to manage property referrals
-- This allows staff members (not just clients/branch managers) to create and view referrals

-- Client staff SELECT policy
drop policy if exists "client_staff_select_property_referrals" on public.property_referrals;
create policy "client_staff_select_property_referrals"
on public.property_referrals
for select
using (
  is_client_staff_for_agency(property_referrals.agency_id)
);

-- Client staff INSERT policy
drop policy if exists "client_staff_insert_property_referrals" on public.property_referrals;
create policy "client_staff_insert_property_referrals"
on public.property_referrals
for insert
with check (
  is_client_staff_for_agency(property_referrals.agency_id)
);

-- Client staff UPDATE policy
drop policy if exists "client_staff_update_property_referrals" on public.property_referrals;
create policy "client_staff_update_property_referrals"
on public.property_referrals
for update
using (
  is_client_staff_for_agency(property_referrals.agency_id)
)
with check (
  is_client_staff_for_agency(property_referrals.agency_id)
);

-- Client staff DELETE policy
drop policy if exists "client_staff_delete_property_referrals" on public.property_referrals;
create policy "client_staff_delete_property_referrals"
on public.property_referrals
for delete
using (
  is_client_staff_for_agency(property_referrals.agency_id)
);
