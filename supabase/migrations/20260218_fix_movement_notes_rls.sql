-- =====================================================
-- Fix movement_notes RLS for client/branch manager access
-- =====================================================

DROP POLICY IF EXISTS "client_select_movement_notes" ON public.movement_notes;
DROP POLICY IF EXISTS "client_insert_movement_notes" ON public.movement_notes;
DROP POLICY IF EXISTS "client_update_movement_notes" ON public.movement_notes;
DROP POLICY IF EXISTS "client_delete_movement_notes" ON public.movement_notes;

CREATE POLICY "client_select_movement_notes" ON public.movement_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.movements m
    WHERE m.id = movement_notes.movement_id
      AND (
        is_client_for_agency(m.agency_id)
        OR (m.client_id IS NOT NULL AND user_belongs_to_client(m.client_id))
        OR (m.client_id IS NULL AND is_grip_owner(m.agency_id))
      )
  )
);

CREATE POLICY "client_insert_movement_notes" ON public.movement_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.movements m
    WHERE m.id = movement_notes.movement_id
      AND (
        is_client_for_agency(m.agency_id)
        OR (m.client_id IS NOT NULL AND user_belongs_to_client(m.client_id))
        OR (m.client_id IS NULL AND is_grip_owner(m.agency_id))
      )
  )
);

CREATE POLICY "client_update_movement_notes" ON public.movement_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.movements m
    WHERE m.id = movement_notes.movement_id
      AND (
        is_client_for_agency(m.agency_id)
        OR (m.client_id IS NOT NULL AND user_belongs_to_client(m.client_id))
        OR (m.client_id IS NULL AND is_grip_owner(m.agency_id))
      )
  )
);

CREATE POLICY "client_delete_movement_notes" ON public.movement_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.movements m
    WHERE m.id = movement_notes.movement_id
      AND (
        is_client_for_agency(m.agency_id)
        OR (m.client_id IS NOT NULL AND user_belongs_to_client(m.client_id))
        OR (m.client_id IS NULL AND is_grip_owner(m.agency_id))
      )
  )
);
