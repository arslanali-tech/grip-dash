-- =====================================================
-- Client Data Isolation Migration
-- =====================================================
-- This migration:
-- 1. Fixes existing RLS policies to properly handle client users with client_id in user_metadata
-- 2. Adds client_id column to data tables for future data isolation
-- 3. Updates RLS policies to use client_id when available
--
-- Problem: All clients share the same agency_id (GRIP Owner's agency),
-- and existing RLS policies don't properly check client_id in user_metadata.
--
-- Solution: Fix policies to check user_metadata.client_id for all client roles.
-- =====================================================

-- =============================
-- IMMEDIATE FIX: Helper function to check if user is a client for the agency
-- This works with existing data (no client_id column needed)
-- =============================
CREATE OR REPLACE FUNCTION public.is_client_for_agency(target_agency_id uuid)
RETURNS boolean AS $$
DECLARE
  v_email text;
  v_client_id uuid;
BEGIN
  -- Get user's email
  v_email := auth.jwt() ->> 'email';
  
  -- Try to get client_id from user_metadata (works for all client/branch_manager users)
  v_client_id := (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid;
  
  -- If we have client_id in metadata, check if that client belongs to this agency
  IF v_client_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = v_client_id
        AND c.agency_id = target_agency_id
    );
  END IF;
  
  -- Fallback: check by email match
  IF v_email IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.agency_id = target_agency_id
        AND lower(c.email) = lower(v_email)
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- IMMEDIATE FIX: Update team_channels policies
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_select_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_insert_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_update_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_delete_team_channels" ON public.team_channels;

CREATE POLICY "client_select_team_channels_v2"
ON public.team_channels FOR SELECT
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_insert_team_channels_v2"
ON public.team_channels FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_update_team_channels_v2"
ON public.team_channels FOR UPDATE
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_delete_team_channels_v2"
ON public.team_channels FOR DELETE
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

-- =============================
-- IMMEDIATE FIX: Update team_messages policies
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_select_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_insert_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_update_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_delete_team_messages" ON public.team_messages;

CREATE POLICY "client_select_team_messages_v2"
ON public.team_messages FOR SELECT
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_insert_team_messages_v2"
ON public.team_messages FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_update_team_messages_v2"
ON public.team_messages FOR UPDATE
USING ((is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id)) AND sender_id = auth.uid())
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_delete_team_messages_v2"
ON public.team_messages FOR DELETE
USING ((is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id)) AND sender_id = auth.uid());

-- =============================
-- IMMEDIATE FIX: Update team_direct_messages policies
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_select_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_insert_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_update_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_delete_team_direct_messages" ON public.team_direct_messages;

CREATE POLICY "client_select_team_direct_messages_v2"
ON public.team_direct_messages FOR SELECT
USING (
  (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "client_insert_team_direct_messages_v2"
ON public.team_direct_messages FOR INSERT
WITH CHECK (
  (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
  AND sender_id = auth.uid()
);

CREATE POLICY "client_update_team_direct_messages_v2"
ON public.team_direct_messages FOR UPDATE
USING (
  (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "client_delete_team_direct_messages_v2"
ON public.team_direct_messages FOR DELETE
USING (
  (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
  AND sender_id = auth.uid()
);

-- =============================
-- IMMEDIATE FIX: Update movements policies
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_movements" ON public.movements;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_movements" ON public.movements;
DROP POLICY IF EXISTS "client_or_branch_manager_update_movements" ON public.movements;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_movements" ON public.movements;

CREATE POLICY "client_select_movements_v2"
ON public.movements FOR SELECT
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_insert_movements_v2"
ON public.movements FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_update_movements_v2"
ON public.movements FOR UPDATE
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_delete_movements_v2"
ON public.movements FOR DELETE
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

-- =============================
-- IMMEDIATE FIX: Update prospects policies
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_or_branch_manager_update_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_prospects" ON public.prospects;

CREATE POLICY "client_select_prospects_v2"
ON public.prospects FOR SELECT
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_insert_prospects_v2"
ON public.prospects FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_update_prospects_v2"
ON public.prospects FOR UPDATE
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id))
WITH CHECK (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

CREATE POLICY "client_delete_prospects_v2"
ON public.prospects FOR DELETE
USING (is_client_for_agency(agency_id) OR is_client_staff_for_agency(agency_id));

-- =============================
-- 1. Add client_id column to movements table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'movements' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.movements ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS movements_client_id_idx ON public.movements(client_id);
  END IF;
END $$;

-- =============================
-- 2. Add client_id column to prospects table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'prospects' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.prospects ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS prospects_client_id_idx ON public.prospects(client_id);
  END IF;
END $$;

-- =============================
-- 3. Add client_id column to team_channels table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'team_channels' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.team_channels ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS team_channels_client_id_idx ON public.team_channels(client_id);
  END IF;
END $$;

-- =============================
-- 4. Add client_id column to team_messages table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'team_messages' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.team_messages ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS team_messages_client_id_idx ON public.team_messages(client_id);
  END IF;
END $$;

-- =============================
-- 5. Add client_id column to team_direct_messages table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'team_direct_messages' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.team_direct_messages ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS team_direct_messages_client_id_idx ON public.team_direct_messages(client_id);
  END IF;
END $$;

-- =============================
-- 6. Add client_id column to property_referrals table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'property_referrals' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.property_referrals ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS property_referrals_client_id_idx ON public.property_referrals(client_id);
  END IF;
END $$;

-- =============================
-- 7. Add client_id column to b2b_companies table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'b2b_companies' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.b2b_companies ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS b2b_companies_client_id_idx ON public.b2b_companies(client_id);
  END IF;
END $$;

-- =============================
-- 8. Add client_id column to b2b_referrals table
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'b2b_referrals' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.b2b_referrals ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS b2b_referrals_client_id_idx ON public.b2b_referrals(client_id);
  END IF;
END $$;

-- =============================
-- Helper function: Get user's client_id from JWT
-- =============================
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_email text;
BEGIN
  -- Try to get client_id from user_metadata
  v_client_id := (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid;
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- Try to get client_id from top-level JWT
  v_client_id := (auth.jwt() ->> 'client_id')::uuid;
  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;
  
  -- Fallback: look up client by email
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE lower(email) = lower(v_email)
    LIMIT 1;
  END IF;
  
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- Helper function: Check if user is GRIP Owner
-- =============================
CREATE OR REPLACE FUNCTION public.is_grip_owner(target_agency_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = target_agency_id
      AND a.owner_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- Helper function: Check if user belongs to a client
-- =============================
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(target_client_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_client_id uuid;
  v_email text;
BEGIN
  -- Get user's client_id
  v_user_client_id := public.get_user_client_id();
  IF v_user_client_id IS NOT NULL AND v_user_client_id = target_client_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user's email matches the client's email
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = target_client_id
        AND lower(c.email) = lower(v_email)
    );
  END IF;
  
  -- Check if user is client_staff for this client
  IF v_email IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.client_staff cs
      WHERE cs.client_id = target_client_id
        AND lower(cs.email) = lower(v_email)
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- UPDATE RLS POLICIES FOR MOVEMENTS
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_movements" ON public.movements;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_movements" ON public.movements;
DROP POLICY IF EXISTS "client_or_branch_manager_update_movements" ON public.movements;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_movements" ON public.movements;

-- Owner can see all movements in their agency
CREATE POLICY "owner_select_movements"
ON public.movements FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_movements"
ON public.movements FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_movements"
ON public.movements FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_movements"
ON public.movements FOR DELETE
USING (is_grip_owner(agency_id));

-- Clients can see movements that belong to them OR movements without client_id in their agency
-- (backwards compatible with existing data that doesn't have client_id set)
CREATE POLICY "client_select_own_movements"
ON public.movements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = movements.agency_id
      AND user_belongs_to_client(c.id)
      AND (movements.client_id IS NULL OR movements.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_movements"
ON public.movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = movements.agency_id
      AND user_belongs_to_client(c.id)
      AND (movements.client_id IS NULL OR movements.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_movements"
ON public.movements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = movements.agency_id
      AND user_belongs_to_client(c.id)
      AND (movements.client_id IS NULL OR movements.client_id = c.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = movements.agency_id
      AND user_belongs_to_client(c.id)
      AND (movements.client_id IS NULL OR movements.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_movements"
ON public.movements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = movements.agency_id
      AND user_belongs_to_client(c.id)
      AND (movements.client_id IS NULL OR movements.client_id = c.id)
  )
);

-- =============================
-- UPDATE RLS POLICIES FOR PROSPECTS
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_or_branch_manager_update_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_prospects" ON public.prospects;

-- Owner policies
CREATE POLICY "owner_select_prospects"
ON public.prospects FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_prospects"
ON public.prospects FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_prospects"
ON public.prospects FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_prospects"
ON public.prospects FOR DELETE
USING (is_grip_owner(agency_id));

-- Client policies (backwards compatible - allows access when client_id is NULL or matches)
CREATE POLICY "client_select_own_prospects"
ON public.prospects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = prospects.agency_id
      AND user_belongs_to_client(c.id)
      AND (prospects.client_id IS NULL OR prospects.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_prospects"
ON public.prospects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = prospects.agency_id
      AND user_belongs_to_client(c.id)
      AND (prospects.client_id IS NULL OR prospects.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_prospects"
ON public.prospects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = prospects.agency_id
      AND user_belongs_to_client(c.id)
      AND (prospects.client_id IS NULL OR prospects.client_id = c.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = prospects.agency_id
      AND user_belongs_to_client(c.id)
      AND (prospects.client_id IS NULL OR prospects.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_prospects"
ON public.prospects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = prospects.agency_id
      AND user_belongs_to_client(c.id)
      AND (prospects.client_id IS NULL OR prospects.client_id = c.id)
  )
);

-- =============================
-- UPDATE RLS POLICIES FOR TEAM_CHANNELS
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_select_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_insert_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_update_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_delete_team_channels" ON public.team_channels;

-- Client policies for team_channels (backwards compatible)
CREATE POLICY "client_select_own_team_channels"
ON public.team_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_channels.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_channels.client_id IS NULL OR team_channels.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_team_channels"
ON public.team_channels FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_channels.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_channels.client_id IS NULL OR team_channels.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_team_channels"
ON public.team_channels FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_channels.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_channels.client_id IS NULL OR team_channels.client_id = c.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_channels.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_channels.client_id IS NULL OR team_channels.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_team_channels"
ON public.team_channels FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_channels.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_channels.client_id IS NULL OR team_channels.client_id = c.id)
  )
);

-- =============================
-- UPDATE RLS POLICIES FOR TEAM_MESSAGES
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_select_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_insert_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_update_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_delete_team_messages" ON public.team_messages;

-- Client policies for team_messages (backwards compatible)
CREATE POLICY "client_select_own_team_messages"
ON public.team_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_messages.client_id IS NULL OR team_messages.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_team_messages"
ON public.team_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_messages.client_id IS NULL OR team_messages.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_team_messages"
ON public.team_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_messages.client_id IS NULL OR team_messages.client_id = c.id)
  )
  AND sender_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_messages.client_id IS NULL OR team_messages.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_team_messages"
ON public.team_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_messages.client_id IS NULL OR team_messages.client_id = c.id)
  )
  AND sender_id = auth.uid()
);

-- =============================
-- UPDATE RLS POLICIES FOR TEAM_DIRECT_MESSAGES
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_select_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_insert_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_update_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_delete_team_direct_messages" ON public.team_direct_messages;

-- Client policies for team_direct_messages (backwards compatible, plus user must be sender/recipient)
CREATE POLICY "client_select_own_team_direct_messages"
ON public.team_direct_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_direct_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_direct_messages.client_id IS NULL OR team_direct_messages.client_id = c.id)
  )
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "client_insert_own_team_direct_messages"
ON public.team_direct_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_direct_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_direct_messages.client_id IS NULL OR team_direct_messages.client_id = c.id)
  )
  AND sender_id = auth.uid()
);

CREATE POLICY "client_update_own_team_direct_messages"
ON public.team_direct_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_direct_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_direct_messages.client_id IS NULL OR team_direct_messages.client_id = c.id)
  )
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "client_delete_own_team_direct_messages"
ON public.team_direct_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = team_direct_messages.agency_id
      AND user_belongs_to_client(c.id)
      AND (team_direct_messages.client_id IS NULL OR team_direct_messages.client_id = c.id)
  )
  AND sender_id = auth.uid()
);

-- =============================
-- UPDATE RLS POLICIES FOR PROPERTY_REFERRALS
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_update_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_staff_select_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_staff_insert_property_referrals" ON public.property_referrals;

-- Owner policies
CREATE POLICY "owner_select_property_referrals"
ON public.property_referrals FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_property_referrals"
ON public.property_referrals FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_property_referrals"
ON public.property_referrals FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_property_referrals"
ON public.property_referrals FOR DELETE
USING (is_grip_owner(agency_id));

-- Client policies (backwards compatible)
CREATE POLICY "client_select_own_property_referrals"
ON public.property_referrals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (property_referrals.client_id IS NULL OR property_referrals.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_property_referrals"
ON public.property_referrals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (property_referrals.client_id IS NULL OR property_referrals.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_property_referrals"
ON public.property_referrals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (property_referrals.client_id IS NULL OR property_referrals.client_id = c.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (property_referrals.client_id IS NULL OR property_referrals.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_property_referrals"
ON public.property_referrals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = property_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (property_referrals.client_id IS NULL OR property_referrals.client_id = c.id)
  )
);

-- =============================
-- UPDATE RLS POLICIES FOR B2B_COMPANIES
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_or_branch_manager_update_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_b2b_companies" ON public.b2b_companies;

-- Owner policies
CREATE POLICY "owner_select_b2b_companies"
ON public.b2b_companies FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_b2b_companies"
ON public.b2b_companies FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_b2b_companies"
ON public.b2b_companies FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_b2b_companies"
ON public.b2b_companies FOR DELETE
USING (is_grip_owner(agency_id));

-- Client policies (backwards compatible)
CREATE POLICY "client_select_own_b2b_companies"
ON public.b2b_companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_companies.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_companies.client_id IS NULL OR b2b_companies.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_b2b_companies"
ON public.b2b_companies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_companies.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_companies.client_id IS NULL OR b2b_companies.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_b2b_companies"
ON public.b2b_companies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_companies.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_companies.client_id IS NULL OR b2b_companies.client_id = c.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_companies.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_companies.client_id IS NULL OR b2b_companies.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_b2b_companies"
ON public.b2b_companies FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_companies.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_companies.client_id IS NULL OR b2b_companies.client_id = c.id)
  )
);

-- =============================
-- UPDATE RLS POLICIES FOR B2B_REFERRALS
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_update_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_b2b_referrals" ON public.b2b_referrals;

-- Owner policies
CREATE POLICY "owner_select_b2b_referrals"
ON public.b2b_referrals FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_b2b_referrals"
ON public.b2b_referrals FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_b2b_referrals"
ON public.b2b_referrals FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_b2b_referrals"
ON public.b2b_referrals FOR DELETE
USING (is_grip_owner(agency_id));

-- Client policies (backwards compatible)
CREATE POLICY "client_select_own_b2b_referrals"
ON public.b2b_referrals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_referrals.client_id IS NULL OR b2b_referrals.client_id = c.id)
  )
);

CREATE POLICY "client_insert_own_b2b_referrals"
ON public.b2b_referrals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_referrals.client_id IS NULL OR b2b_referrals.client_id = c.id)
  )
);

CREATE POLICY "client_update_own_b2b_referrals"
ON public.b2b_referrals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_referrals.client_id IS NULL OR b2b_referrals.client_id = c.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_referrals.client_id IS NULL OR b2b_referrals.client_id = c.id)
  )
);

CREATE POLICY "client_delete_own_b2b_referrals"
ON public.b2b_referrals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.agency_id = b2b_referrals.agency_id
      AND user_belongs_to_client(c.id)
      AND (b2b_referrals.client_id IS NULL OR b2b_referrals.client_id = c.id)
  )
);
