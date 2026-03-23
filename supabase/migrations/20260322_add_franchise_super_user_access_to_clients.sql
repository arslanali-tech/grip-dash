-- =====================================================
-- Add franchise super user access flag to clients
-- =====================================================
-- This stores whether a client should be treated as part of a
-- franchise / umbrella group for Grip owner super-user management.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'franchise_super_user_access'
  ) THEN
    ALTER TABLE public.clients
      ADD COLUMN franchise_super_user_access boolean NOT NULL DEFAULT false;
  END IF;
END $$;

