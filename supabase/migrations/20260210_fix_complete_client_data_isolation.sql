-- =====================================================
-- Complete Client Data Isolation Migration
-- =====================================================
-- This migration ensures ALL client-facing tables have proper client_id
-- isolation, so clients under the same agency cannot see each other's data.
-- =====================================================

-- =============================
-- Helper function: Get current user's client_id
-- =============================
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
-- Helper function: Check if user belongs to a specific client
-- =============================
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(target_client_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_client_id uuid;
BEGIN
  v_user_client_id := public.get_current_user_client_id();
  RETURN v_user_client_id IS NOT NULL AND v_user_client_id = target_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- Helper function: Check if user is GRIP Owner for agency
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
-- 1. Add client_id to diary_events
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'diary_events' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.diary_events ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS diary_events_client_id_idx ON public.diary_events(client_id);
  END IF;
END $$;

-- Update diary_events RLS
DROP POLICY IF EXISTS "client_select_diary_events" ON public.diary_events;
DROP POLICY IF EXISTS "client_insert_diary_events" ON public.diary_events;
DROP POLICY IF EXISTS "client_update_diary_events" ON public.diary_events;
DROP POLICY IF EXISTS "client_delete_diary_events" ON public.diary_events;

CREATE POLICY "client_select_diary_events" ON public.diary_events FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_diary_events" ON public.diary_events FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_diary_events" ON public.diary_events FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_diary_events" ON public.diary_events FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 2. Add client_id to tasks
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS tasks_client_id_idx ON public.tasks(client_id);
  END IF;
END $$;

-- Update tasks RLS
DROP POLICY IF EXISTS "client_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "client_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "client_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "client_delete_tasks" ON public.tasks;

CREATE POLICY "client_select_tasks" ON public.tasks FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_tasks" ON public.tasks FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_tasks" ON public.tasks FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_tasks" ON public.tasks FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 3. Add client_id to mileage_logs
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'mileage_logs' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.mileage_logs ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS mileage_logs_client_id_idx ON public.mileage_logs(client_id);
  END IF;
END $$;

-- Update mileage_logs RLS
DROP POLICY IF EXISTS "client_select_mileage_logs" ON public.mileage_logs;
DROP POLICY IF EXISTS "client_insert_mileage_logs" ON public.mileage_logs;

CREATE POLICY "client_select_mileage_logs" ON public.mileage_logs FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_mileage_logs" ON public.mileage_logs FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 4. Add client_id to branch_goals
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'branch_goals' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.branch_goals ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS branch_goals_client_id_idx ON public.branch_goals(client_id);
  END IF;
END $$;

-- Update branch_goals RLS
DROP POLICY IF EXISTS "client_select_branch_goals" ON public.branch_goals;
DROP POLICY IF EXISTS "client_insert_branch_goals" ON public.branch_goals;
DROP POLICY IF EXISTS "client_update_branch_goals" ON public.branch_goals;
DROP POLICY IF EXISTS "client_delete_branch_goals" ON public.branch_goals;
DROP POLICY IF EXISTS "staff_select_branch_goals" ON public.branch_goals;

CREATE POLICY "client_select_branch_goals" ON public.branch_goals FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_branch_goals" ON public.branch_goals FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_branch_goals" ON public.branch_goals FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_branch_goals" ON public.branch_goals FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 5. Add client_id to hub_folders
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hub_folders' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.hub_folders ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS hub_folders_client_id_idx ON public.hub_folders(client_id);
  END IF;
END $$;

-- Update hub_folders RLS
DROP POLICY IF EXISTS "client_select_hub_folders" ON public.hub_folders;
DROP POLICY IF EXISTS "client_insert_hub_folders" ON public.hub_folders;
DROP POLICY IF EXISTS "client_update_hub_folders" ON public.hub_folders;
DROP POLICY IF EXISTS "client_delete_hub_folders" ON public.hub_folders;
DROP POLICY IF EXISTS "staff_select_hub_folders" ON public.hub_folders;

CREATE POLICY "client_select_hub_folders" ON public.hub_folders FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_hub_folders" ON public.hub_folders FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_hub_folders" ON public.hub_folders FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_hub_folders" ON public.hub_folders FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 6. Add client_id to hub_documents
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'hub_documents' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.hub_documents ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS hub_documents_client_id_idx ON public.hub_documents(client_id);
  END IF;
END $$;

-- Update hub_documents RLS
DROP POLICY IF EXISTS "client_select_hub_documents" ON public.hub_documents;
DROP POLICY IF EXISTS "client_insert_hub_documents" ON public.hub_documents;
DROP POLICY IF EXISTS "client_update_hub_documents" ON public.hub_documents;
DROP POLICY IF EXISTS "client_delete_hub_documents" ON public.hub_documents;
DROP POLICY IF EXISTS "staff_select_hub_documents" ON public.hub_documents;

CREATE POLICY "client_select_hub_documents" ON public.hub_documents FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_hub_documents" ON public.hub_documents FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_hub_documents" ON public.hub_documents FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_hub_documents" ON public.hub_documents FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 7. Add client_id to health_safety_items
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'health_safety_items' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.health_safety_items ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS health_safety_items_client_id_idx ON public.health_safety_items(client_id);
  END IF;
END $$;

-- Update health_safety_items RLS
DROP POLICY IF EXISTS "client_select_health_safety_items" ON public.health_safety_items;
DROP POLICY IF EXISTS "client_insert_health_safety_items" ON public.health_safety_items;
DROP POLICY IF EXISTS "client_update_health_safety_items" ON public.health_safety_items;
DROP POLICY IF EXISTS "client_delete_health_safety_items" ON public.health_safety_items;

CREATE POLICY "client_select_health_safety_items" ON public.health_safety_items FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_health_safety_items" ON public.health_safety_items FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_health_safety_items" ON public.health_safety_items FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_health_safety_items" ON public.health_safety_items FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 8. Add client_id to commission_rules
-- =============================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'commission_rules'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'client_id'
    ) THEN
      ALTER TABLE public.commission_rules ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS commission_rules_client_id_idx ON public.commission_rules(client_id);
    END IF;
  END IF;
END $$;

-- Update commission_rules RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'commission_rules'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view commission rules in their agency" ON public.commission_rules';
    EXECUTE 'DROP POLICY IF EXISTS "Agency admins can manage commission rules" ON public.commission_rules';
    EXECUTE 'DROP POLICY IF EXISTS "client_select_commission_rules" ON public.commission_rules';
    EXECUTE 'DROP POLICY IF EXISTS "client_insert_commission_rules" ON public.commission_rules';
    EXECUTE 'DROP POLICY IF EXISTS "client_update_commission_rules" ON public.commission_rules';
    EXECUTE 'DROP POLICY IF EXISTS "client_delete_commission_rules" ON public.commission_rules';

    EXECUTE 'CREATE POLICY "client_select_commission_rules" ON public.commission_rules FOR SELECT
    USING (
      (client_id IS NOT NULL AND user_belongs_to_client(client_id))
      OR (client_id IS NULL AND is_grip_owner(agency_id))
    )';

    EXECUTE 'CREATE POLICY "client_insert_commission_rules" ON public.commission_rules FOR INSERT
    WITH CHECK (
      (client_id IS NOT NULL AND user_belongs_to_client(client_id))
      OR (client_id IS NULL AND is_grip_owner(agency_id))
    )';

    EXECUTE 'CREATE POLICY "client_update_commission_rules" ON public.commission_rules FOR UPDATE
    USING (
      (client_id IS NOT NULL AND user_belongs_to_client(client_id))
      OR (client_id IS NULL AND is_grip_owner(agency_id))
    )
    WITH CHECK (
      (client_id IS NOT NULL AND user_belongs_to_client(client_id))
      OR (client_id IS NULL AND is_grip_owner(agency_id))
    )';

    EXECUTE 'CREATE POLICY "client_delete_commission_rules" ON public.commission_rules FOR DELETE
    USING (
      (client_id IS NOT NULL AND user_belongs_to_client(client_id))
      OR (client_id IS NULL AND is_grip_owner(agency_id))
    )';
  END IF;
END $$;

-- =============================
-- 9. Add client_id to pnl_statements (if exists)
-- =============================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pnl_statements') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pnl_statements' AND column_name = 'client_id'
    ) THEN
      ALTER TABLE public.pnl_statements ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS pnl_statements_client_id_idx ON public.pnl_statements(client_id);
    END IF;
  END IF;
END $$;

-- Update pnl_statements RLS if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pnl_statements') THEN
    EXECUTE 'DROP POLICY IF EXISTS "client_select_pnl_statements" ON public.pnl_statements';
    EXECUTE 'DROP POLICY IF EXISTS "client_insert_pnl_statements" ON public.pnl_statements';
    EXECUTE 'DROP POLICY IF EXISTS "client_update_pnl_statements" ON public.pnl_statements';
    EXECUTE 'DROP POLICY IF EXISTS "client_delete_pnl_statements" ON public.pnl_statements';
    
    EXECUTE 'CREATE POLICY "client_select_pnl_statements" ON public.pnl_statements FOR SELECT
    USING ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))';
    
    EXECUTE 'CREATE POLICY "client_insert_pnl_statements" ON public.pnl_statements FOR INSERT
    WITH CHECK ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))';
    
    EXECUTE 'CREATE POLICY "client_update_pnl_statements" ON public.pnl_statements FOR UPDATE
    USING ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
    WITH CHECK ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))';
    
    EXECUTE 'CREATE POLICY "client_delete_pnl_statements" ON public.pnl_statements FOR DELETE
    USING ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))';
  END IF;
END $$;

-- =============================
-- 10. Fix movements RLS - ensure only client's data is visible
-- =============================
DROP POLICY IF EXISTS "client_select_own_movements" ON public.movements;
DROP POLICY IF EXISTS "client_insert_own_movements" ON public.movements;
DROP POLICY IF EXISTS "client_update_own_movements" ON public.movements;
DROP POLICY IF EXISTS "client_delete_own_movements" ON public.movements;
DROP POLICY IF EXISTS "owner_select_movements" ON public.movements;
DROP POLICY IF EXISTS "owner_insert_movements" ON public.movements;
DROP POLICY IF EXISTS "owner_update_movements" ON public.movements;
DROP POLICY IF EXISTS "owner_delete_movements" ON public.movements;

-- Owner can see all movements
CREATE POLICY "owner_select_movements" ON public.movements FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_movements" ON public.movements FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_movements" ON public.movements FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_movements" ON public.movements FOR DELETE
USING (is_grip_owner(agency_id));

-- Clients can only see movements with their client_id
CREATE POLICY "client_select_own_movements" ON public.movements FOR SELECT
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_movements" ON public.movements FOR INSERT
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_update_own_movements" ON public.movements FOR UPDATE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id))
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_delete_own_movements" ON public.movements FOR DELETE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

-- =============================
-- 11. Fix prospects RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_insert_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_update_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_delete_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "owner_select_prospects" ON public.prospects;
DROP POLICY IF EXISTS "owner_insert_prospects" ON public.prospects;
DROP POLICY IF EXISTS "owner_update_prospects" ON public.prospects;
DROP POLICY IF EXISTS "owner_delete_prospects" ON public.prospects;

-- Owner can see all prospects
CREATE POLICY "owner_select_prospects" ON public.prospects FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_prospects" ON public.prospects FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_prospects" ON public.prospects FOR UPDATE
USING (is_grip_owner(agency_id))
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_prospects" ON public.prospects FOR DELETE
USING (is_grip_owner(agency_id));

-- Clients can only see prospects with their client_id
CREATE POLICY "client_select_own_prospects" ON public.prospects FOR SELECT
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_prospects" ON public.prospects FOR INSERT
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_update_own_prospects" ON public.prospects FOR UPDATE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id))
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_delete_own_prospects" ON public.prospects FOR DELETE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

-- =============================
-- 12. Fix team_channels RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_insert_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_update_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_delete_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_select_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_insert_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_update_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_staff_delete_team_channels" ON public.team_channels;

-- Clients can only see channels with their client_id
CREATE POLICY "client_select_own_team_channels" ON public.team_channels FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_own_team_channels" ON public.team_channels FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_own_team_channels" ON public.team_channels FOR UPDATE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_own_team_channels" ON public.team_channels FOR DELETE
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

-- =============================
-- 13. Fix team_messages RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_insert_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_update_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_delete_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_select_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_insert_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_update_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_staff_delete_team_messages" ON public.team_messages;

-- Clients can only see messages with their client_id
CREATE POLICY "client_select_own_team_messages" ON public.team_messages FOR SELECT
USING (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_insert_own_team_messages" ON public.team_messages FOR INSERT
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_update_own_team_messages" ON public.team_messages FOR UPDATE
USING (
  ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
  AND sender_id = auth.uid()
)
WITH CHECK (
  (client_id IS NOT NULL AND user_belongs_to_client(client_id))
  OR (client_id IS NULL AND is_grip_owner(agency_id))
);

CREATE POLICY "client_delete_own_team_messages" ON public.team_messages FOR DELETE
USING (
  ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
  AND sender_id = auth.uid()
);

-- =============================
-- 14. Fix team_direct_messages RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_insert_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_update_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_delete_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_select_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_update_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_select_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_insert_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_update_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_staff_delete_team_direct_messages" ON public.team_direct_messages;

-- Clients can only see DMs with their client_id
CREATE POLICY "client_select_own_team_direct_messages" ON public.team_direct_messages FOR SELECT
USING (
  ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "client_insert_own_team_direct_messages" ON public.team_direct_messages FOR INSERT
WITH CHECK (
  ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
  AND sender_id = auth.uid()
);

CREATE POLICY "client_update_own_team_direct_messages" ON public.team_direct_messages FOR UPDATE
USING (
  ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
  AND (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "client_delete_own_team_direct_messages" ON public.team_direct_messages FOR DELETE
USING (
  ((client_id IS NOT NULL AND user_belongs_to_client(client_id)) OR (client_id IS NULL AND is_grip_owner(agency_id)))
  AND sender_id = auth.uid()
);

-- =============================
-- 15. Fix b2b_companies RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_insert_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_update_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_delete_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "owner_select_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "owner_insert_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "owner_update_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "owner_delete_b2b_companies" ON public.b2b_companies;

CREATE POLICY "owner_select_b2b_companies" ON public.b2b_companies FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_b2b_companies" ON public.b2b_companies FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_b2b_companies" ON public.b2b_companies FOR UPDATE
USING (is_grip_owner(agency_id)) WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_b2b_companies" ON public.b2b_companies FOR DELETE
USING (is_grip_owner(agency_id));

CREATE POLICY "client_select_own_b2b_companies" ON public.b2b_companies FOR SELECT
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_b2b_companies" ON public.b2b_companies FOR INSERT
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_update_own_b2b_companies" ON public.b2b_companies FOR UPDATE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id))
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_delete_own_b2b_companies" ON public.b2b_companies FOR DELETE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

-- =============================
-- 16. Fix b2b_referrals RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_insert_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_update_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_delete_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "owner_select_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "owner_insert_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "owner_update_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "owner_delete_b2b_referrals" ON public.b2b_referrals;

CREATE POLICY "owner_select_b2b_referrals" ON public.b2b_referrals FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_b2b_referrals" ON public.b2b_referrals FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_b2b_referrals" ON public.b2b_referrals FOR UPDATE
USING (is_grip_owner(agency_id)) WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_b2b_referrals" ON public.b2b_referrals FOR DELETE
USING (is_grip_owner(agency_id));

CREATE POLICY "client_select_own_b2b_referrals" ON public.b2b_referrals FOR SELECT
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_b2b_referrals" ON public.b2b_referrals FOR INSERT
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_update_own_b2b_referrals" ON public.b2b_referrals FOR UPDATE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id))
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_delete_own_b2b_referrals" ON public.b2b_referrals FOR DELETE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

-- =============================
-- 17. Fix property_referrals RLS
-- =============================
DROP POLICY IF EXISTS "client_select_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_insert_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_update_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_delete_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "owner_select_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "owner_insert_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "owner_update_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "owner_delete_property_referrals" ON public.property_referrals;

CREATE POLICY "owner_select_property_referrals" ON public.property_referrals FOR SELECT
USING (is_grip_owner(agency_id));

CREATE POLICY "owner_insert_property_referrals" ON public.property_referrals FOR INSERT
WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_update_property_referrals" ON public.property_referrals FOR UPDATE
USING (is_grip_owner(agency_id)) WITH CHECK (is_grip_owner(agency_id));

CREATE POLICY "owner_delete_property_referrals" ON public.property_referrals FOR DELETE
USING (is_grip_owner(agency_id));

CREATE POLICY "client_select_own_property_referrals" ON public.property_referrals FOR SELECT
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_property_referrals" ON public.property_referrals FOR INSERT
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_update_own_property_referrals" ON public.property_referrals FOR UPDATE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id))
WITH CHECK (client_id IS NOT NULL AND user_belongs_to_client(client_id));

CREATE POLICY "client_delete_own_property_referrals" ON public.property_referrals FOR DELETE
USING (client_id IS NOT NULL AND user_belongs_to_client(client_id));
