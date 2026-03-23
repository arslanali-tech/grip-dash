-- =====================================================
-- Franchise groups for real super-user grouping
-- =====================================================
-- This creates a real group record that multiple clients can belong to.
-- The first client created for a group becomes the super-user account.
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'franchise_groups'
  ) THEN
    CREATE TABLE public.franchise_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
      name text NOT NULL,
      super_user_client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS franchise_groups_agency_id_idx ON public.franchise_groups (agency_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'franchise_group_id'
  ) THEN
    ALTER TABLE public.clients
      ADD COLUMN franchise_group_id uuid REFERENCES public.franchise_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'franchise_group_name'
  ) THEN
    ALTER TABLE public.clients
      ADD COLUMN franchise_group_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS clients_franchise_group_id_idx ON public.clients (franchise_group_id);

