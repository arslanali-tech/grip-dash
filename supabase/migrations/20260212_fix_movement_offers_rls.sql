-- Ensure movement_offers RLS allows agency admins, clients, client staff, and branch managers
-- Drops legacy admin-only policy and applies unified client-aware policies

BEGIN;

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.movement_offers ENABLE ROW LEVEL SECURITY;

-- Drop legacy admin-only policy if present
DROP POLICY IF EXISTS "movement_offers_agency_access" ON public.movement_offers;

-- Recreate client-aware policies (matches pattern used across other tables)
DROP POLICY IF EXISTS "client_select_movement_offers" ON public.movement_offers;
DROP POLICY IF EXISTS "client_insert_movement_offers" ON public.movement_offers;
DROP POLICY IF EXISTS "client_update_movement_offers" ON public.movement_offers;
DROP POLICY IF EXISTS "client_delete_movement_offers" ON public.movement_offers;

-- SELECT: allow if user belongs to the movement's agency (clients, client staff, branch managers, agency admins)
CREATE POLICY "client_select_movement_offers" ON public.movement_offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.movements m
    WHERE m.id = movement_offers.movement_id
      AND public.is_client_for_agency(m.agency_id)
  )
);

-- INSERT: same condition checked on the row being inserted
CREATE POLICY "client_insert_movement_offers" ON public.movement_offers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.movements m
    WHERE m.id = movement_offers.movement_id
      AND public.is_client_for_agency(m.agency_id)
  )
);

-- UPDATE: same access as select
CREATE POLICY "client_update_movement_offers" ON public.movement_offers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.movements m
    WHERE m.id = movement_offers.movement_id
      AND public.is_client_for_agency(m.agency_id)
  )
);

-- DELETE: same access as select
CREATE POLICY "client_delete_movement_offers" ON public.movement_offers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.movements m
    WHERE m.id = movement_offers.movement_id
      AND public.is_client_for_agency(m.agency_id)
  )
);

COMMIT;
