-- =====================================================
-- Fix: Auto-populate client_id on diary_events and tasks
-- =====================================================
-- The client_insert_diary_events and client_insert_tasks RLS policies
-- require client_id IS NOT NULL for non-GRIP-owner users.
-- When client-side code cannot resolve client_id (e.g. due to RLS on
-- the clients/client_staff tables blocking the lookup), the INSERT
-- sends client_id = NULL and gets a 403.
--
-- This migration adds BEFORE INSERT triggers that auto-populate
-- client_id using the SECURITY DEFINER function
-- get_current_user_client_id() which bypasses RLS.
-- Since BEFORE triggers run before the RLS WITH CHECK evaluation,
-- the policy will see the populated client_id and pass.
-- =====================================================

-- Ensure the helper function exists (idempotent)
CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_email text;
BEGIN
  -- Try to get client_id from user_metadata
  v_client_id := (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid;
  IF v_client_id IS NOT NULL THEN RETURN v_client_id; END IF;

  -- Try to get client_id from top-level JWT
  v_client_id := (auth.jwt() ->> 'client_id')::uuid;
  IF v_client_id IS NOT NULL THEN RETURN v_client_id; END IF;

  -- Fallback: look up client by email
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL THEN
    -- First check if user is directly a client
    SELECT id INTO v_client_id FROM public.clients WHERE lower(email) = lower(v_email) LIMIT 1;
    IF v_client_id IS NOT NULL THEN RETURN v_client_id; END IF;

    -- Then check if user is client_staff
    SELECT client_id INTO v_client_id FROM public.client_staff WHERE lower(email) = lower(v_email) LIMIT 1;
  END IF;

  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- 1. diary_events trigger
-- =============================
CREATE OR REPLACE FUNCTION public.trigger_auto_set_diary_events_client_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := public.get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS diary_events_auto_client_id ON public.diary_events;
CREATE TRIGGER diary_events_auto_client_id
  BEFORE INSERT ON public.diary_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_set_diary_events_client_id();

-- =============================
-- 2. tasks trigger
-- =============================
CREATE OR REPLACE FUNCTION public.trigger_auto_set_tasks_client_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := public.get_current_user_client_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tasks_auto_client_id ON public.tasks;
CREATE TRIGGER tasks_auto_client_id
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_set_tasks_client_id();

-- =============================
-- 3. Backfill existing rows with NULL client_id
-- =============================
UPDATE public.diary_events de
SET client_id = (
  SELECT c.id
  FROM public.clients c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE a.id = de.agency_id
  LIMIT 1
)
WHERE de.client_id IS NULL;

UPDATE public.tasks t
SET client_id = (
  SELECT c.id
  FROM public.clients c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE a.id = t.agency_id
  LIMIT 1
)
WHERE t.client_id IS NULL;
