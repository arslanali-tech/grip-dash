-- Add agency admin access to property_referrals table with strict agency isolation

-- DROP old policies
DROP POLICY IF EXISTS "client_select_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_insert_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_update_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_delete_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "referrals_access_for_clients_and_admins_select" ON public.property_referrals;
DROP POLICY IF EXISTS "referrals_access_for_clients_and_admins_insert" ON public.property_referrals;
DROP POLICY IF EXISTS "referrals_access_for_clients_and_admins_update" ON public.property_referrals;
DROP POLICY IF EXISTS "referrals_access_for_clients_and_admins_delete" ON public.property_referrals;

-- Simplified policies with explicit agency checks
CREATE POLICY "referral_access_select" ON public.property_referrals FOR SELECT
USING (
  -- Allow if user is agency admin for this agency
  EXISTS (
    SELECT 1 FROM public.agency_admins aa 
    WHERE aa.agency_id = property_referrals.agency_id 
    AND aa.user_id = auth.uid()
  )
  OR
  -- Allow if user is a client for this agency
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
    AND lower(c.email) = lower(auth.jwt() ->> 'email')
  )
  OR
  -- Allow if user is staff member for this agency
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.agency_id = property_referrals.agency_id
    AND lower(sm.email) = lower(auth.jwt() ->> 'email')
  )
);

CREATE POLICY "referral_access_insert" ON public.property_referrals FOR INSERT
WITH CHECK (
  -- Allow if user is agency admin for this agency
  EXISTS (
    SELECT 1 FROM public.agency_admins aa 
    WHERE aa.agency_id = property_referrals.agency_id 
    AND aa.user_id = auth.uid()
  )
  OR
  -- Allow if user is a client for this agency
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
    AND lower(c.email) = lower(auth.jwt() ->> 'email')
  )
  OR
  -- Allow if user is staff member for this agency
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.agency_id = property_referrals.agency_id
    AND lower(sm.email) = lower(auth.jwt() ->> 'email')
  )
);

CREATE POLICY "referral_access_update" ON public.property_referrals FOR UPDATE
USING (
  -- Allow if user is agency admin for this agency
  EXISTS (
    SELECT 1 FROM public.agency_admins aa 
    WHERE aa.agency_id = property_referrals.agency_id 
    AND aa.user_id = auth.uid()
  )
  OR
  -- Allow if user is a client for this agency
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
    AND lower(c.email) = lower(auth.jwt() ->> 'email')
  )
  OR
  -- Allow if user is staff member for this agency
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.agency_id = property_referrals.agency_id
    AND lower(sm.email) = lower(auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  -- Allow if user is agency admin for this agency
  EXISTS (
    SELECT 1 FROM public.agency_admins aa 
    WHERE aa.agency_id = property_referrals.agency_id 
    AND aa.user_id = auth.uid()
  )
  OR
  -- Allow if user is a client for this agency
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
    AND lower(c.email) = lower(auth.jwt() ->> 'email')
  )
  OR
  -- Allow if user is staff member for this agency
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.agency_id = property_referrals.agency_id
    AND lower(sm.email) = lower(auth.jwt() ->> 'email')
  )
);

CREATE POLICY "referral_access_delete" ON public.property_referrals FOR DELETE
USING (
  -- Allow if user is agency admin for this agency
  EXISTS (
    SELECT 1 FROM public.agency_admins aa 
    WHERE aa.agency_id = property_referrals.agency_id 
    AND aa.user_id = auth.uid()
  )
  OR
  -- Allow if user is a client for this agency
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
    AND lower(c.email) = lower(auth.jwt() ->> 'email')
  )
  OR
  -- Allow if user is staff member for this agency
  EXISTS (
    SELECT 1 FROM public.staff_members sm
    WHERE sm.agency_id = property_referrals.agency_id
    AND lower(sm.email) = lower(auth.jwt() ->> 'email')
  )
);
