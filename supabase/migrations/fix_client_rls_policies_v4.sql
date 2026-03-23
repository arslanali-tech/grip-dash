-- =====================================================
-- Fix Client RLS Policies v4 - VERIFIED TABLES ONLY
-- =====================================================

-- =============================
-- Drop conflicting v2 policies first
-- =============================
DROP POLICY IF EXISTS "client_select_team_channels_v2" ON public.team_channels;
DROP POLICY IF EXISTS "client_insert_team_channels_v2" ON public.team_channels;
DROP POLICY IF EXISTS "client_update_team_channels_v2" ON public.team_channels;
DROP POLICY IF EXISTS "client_delete_team_channels_v2" ON public.team_channels;

DROP POLICY IF EXISTS "client_select_team_messages_v2" ON public.team_messages;
DROP POLICY IF EXISTS "client_insert_team_messages_v2" ON public.team_messages;
DROP POLICY IF EXISTS "client_update_team_messages_v2" ON public.team_messages;
DROP POLICY IF EXISTS "client_delete_team_messages_v2" ON public.team_messages;

DROP POLICY IF EXISTS "client_select_team_direct_messages_v2" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_insert_team_direct_messages_v2" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_update_team_direct_messages_v2" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_delete_team_direct_messages_v2" ON public.team_direct_messages;

DROP POLICY IF EXISTS "client_select_movements_v2" ON public.movements;
DROP POLICY IF EXISTS "client_insert_movements_v2" ON public.movements;
DROP POLICY IF EXISTS "client_update_movements_v2" ON public.movements;
DROP POLICY IF EXISTS "client_delete_movements_v2" ON public.movements;

DROP POLICY IF EXISTS "client_select_prospects_v2" ON public.prospects;
DROP POLICY IF EXISTS "client_insert_prospects_v2" ON public.prospects;
DROP POLICY IF EXISTS "client_update_prospects_v2" ON public.prospects;
DROP POLICY IF EXISTS "client_delete_prospects_v2" ON public.prospects;

-- =============================
-- Improved helper functions
-- =============================
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_email text;
BEGIN
  v_client_id := (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid;
  IF v_client_id IS NOT NULL THEN RETURN v_client_id; END IF;
  
  v_client_id := (auth.jwt() ->> 'client_id')::uuid;
  IF v_client_id IS NOT NULL THEN RETURN v_client_id; END IF;
  
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_client_id FROM public.clients WHERE lower(email) = lower(v_email) LIMIT 1;
    IF v_client_id IS NOT NULL THEN RETURN v_client_id; END IF;
    
    SELECT client_id INTO v_client_id FROM public.client_staff WHERE lower(email) = lower(v_email) LIMIT 1;
  END IF;
  
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_client_for_agency(target_agency_id uuid)
RETURNS boolean AS $$
DECLARE
  v_email text;
  v_client_id uuid;
  v_role text;
BEGIN
  v_email := auth.jwt() ->> 'email';
  v_role := auth.jwt() -> 'user_metadata' ->> 'role';
  v_client_id := (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid;
  
  IF v_client_id IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM public.clients c WHERE c.id = v_client_id AND c.agency_id = target_agency_id);
  END IF;
  
  IF v_email IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.clients c WHERE c.agency_id = target_agency_id AND lower(c.email) = lower(v_email)) THEN
      RETURN TRUE;
    END IF;
    IF EXISTS (SELECT 1 FROM public.client_staff cs JOIN public.clients c ON c.id = cs.client_id WHERE c.agency_id = target_agency_id AND lower(cs.email) = lower(v_email)) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  IF v_role = 'client' THEN
    IF EXISTS (SELECT 1 FROM public.agency_admins aa WHERE aa.agency_id = target_agency_id AND aa.user_id = auth.uid()) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_belongs_to_client(target_client_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_client_id uuid;
  v_email text;
BEGIN
  v_user_client_id := public.get_user_client_id();
  IF v_user_client_id IS NOT NULL AND v_user_client_id = target_client_id THEN RETURN TRUE; END IF;
  
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.clients c WHERE c.id = target_client_id AND lower(c.email) = lower(v_email)) THEN RETURN TRUE; END IF;
    IF EXISTS (SELECT 1 FROM public.client_staff cs WHERE cs.client_id = target_client_id AND lower(cs.email) = lower(v_email)) THEN RETURN TRUE; END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
RETURNS uuid AS $$
BEGIN
  RETURN public.get_user_client_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================
-- PROSPECTS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_insert_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_update_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "client_delete_own_prospects" ON public.prospects;

CREATE POLICY "client_select_own_prospects" ON public.prospects FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_prospects" ON public.prospects FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_prospects" ON public.prospects FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)))
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_prospects" ON public.prospects FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

-- =============================
-- MOVEMENTS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_own_movements" ON public.movements;
DROP POLICY IF EXISTS "client_insert_own_movements" ON public.movements;
DROP POLICY IF EXISTS "client_update_own_movements" ON public.movements;
DROP POLICY IF EXISTS "client_delete_own_movements" ON public.movements;

CREATE POLICY "client_select_own_movements" ON public.movements FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_movements" ON public.movements FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_movements" ON public.movements FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)))
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_movements" ON public.movements FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

-- =============================
-- TEAM_CHANNELS (from migrations)
-- =============================
DROP POLICY IF EXISTS "client_select_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_insert_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_update_own_team_channels" ON public.team_channels;
DROP POLICY IF EXISTS "client_delete_own_team_channels" ON public.team_channels;

CREATE POLICY "client_select_own_team_channels" ON public.team_channels FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_team_channels" ON public.team_channels FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_team_channels" ON public.team_channels FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)))
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_team_channels" ON public.team_channels FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

-- =============================
-- TEAM_MESSAGES (from migrations)
-- =============================
DROP POLICY IF EXISTS "client_select_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_insert_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_update_own_team_messages" ON public.team_messages;
DROP POLICY IF EXISTS "client_delete_own_team_messages" ON public.team_messages;

CREATE POLICY "client_select_own_team_messages" ON public.team_messages FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_team_messages" ON public.team_messages FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_team_messages" ON public.team_messages FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)) AND sender_id = auth.uid())
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_team_messages" ON public.team_messages FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)) AND sender_id = auth.uid());

-- =============================
-- TEAM_DIRECT_MESSAGES (from migrations)
-- =============================
DROP POLICY IF EXISTS "client_select_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_insert_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_update_own_team_direct_messages" ON public.team_direct_messages;
DROP POLICY IF EXISTS "client_delete_own_team_direct_messages" ON public.team_direct_messages;

CREATE POLICY "client_select_own_team_direct_messages" ON public.team_direct_messages FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)) AND (sender_id = auth.uid() OR recipient_id = auth.uid()));

CREATE POLICY "client_insert_own_team_direct_messages" ON public.team_direct_messages FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()) AND sender_id = auth.uid());

CREATE POLICY "client_update_own_team_direct_messages" ON public.team_direct_messages FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)) AND (sender_id = auth.uid() OR recipient_id = auth.uid()));

CREATE POLICY "client_delete_own_team_direct_messages" ON public.team_direct_messages FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)) AND sender_id = auth.uid());

-- =============================
-- AGENCY_BUSINESS_SECTIONS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_agency_sections" ON public.agency_business_sections;
DROP POLICY IF EXISTS "client_insert_agency_sections" ON public.agency_business_sections;
DROP POLICY IF EXISTS "client_update_agency_sections" ON public.agency_business_sections;
DROP POLICY IF EXISTS "client_delete_agency_sections" ON public.agency_business_sections;

CREATE POLICY "client_select_agency_sections" ON public.agency_business_sections FOR SELECT USING (is_client_for_agency(agency_id));
CREATE POLICY "client_insert_agency_sections" ON public.agency_business_sections FOR INSERT WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_update_agency_sections" ON public.agency_business_sections FOR UPDATE USING (is_client_for_agency(agency_id)) WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_delete_agency_sections" ON public.agency_business_sections FOR DELETE USING (is_client_for_agency(agency_id));

-- =============================
-- PNL_STATEMENTS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_pnl_statements" ON public.pnl_statements;
DROP POLICY IF EXISTS "client_insert_pnl_statements" ON public.pnl_statements;
DROP POLICY IF EXISTS "client_update_pnl_statements" ON public.pnl_statements;
DROP POLICY IF EXISTS "client_delete_pnl_statements" ON public.pnl_statements;

CREATE POLICY "client_select_pnl_statements" ON public.pnl_statements FOR SELECT USING (is_client_for_agency(agency_id));
CREATE POLICY "client_insert_pnl_statements" ON public.pnl_statements FOR INSERT WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_update_pnl_statements" ON public.pnl_statements FOR UPDATE USING (is_client_for_agency(agency_id)) WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_delete_pnl_statements" ON public.pnl_statements FOR DELETE USING (is_client_for_agency(agency_id));

-- =============================
-- PROPERTY_REFERRALS (from migrations)
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_update_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_select_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_insert_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_update_own_property_referrals" ON public.property_referrals;
DROP POLICY IF EXISTS "client_delete_own_property_referrals" ON public.property_referrals;

CREATE POLICY "client_select_own_property_referrals" ON public.property_referrals FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_property_referrals" ON public.property_referrals FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_property_referrals" ON public.property_referrals FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)))
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_property_referrals" ON public.property_referrals FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

-- =============================
-- STAFF_MEMBERS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_staff_members" ON public.staff_members;
DROP POLICY IF EXISTS "client_insert_staff_members" ON public.staff_members;
DROP POLICY IF EXISTS "client_update_staff_members" ON public.staff_members;
DROP POLICY IF EXISTS "client_delete_staff_members" ON public.staff_members;

CREATE POLICY "client_select_staff_members" ON public.staff_members FOR SELECT USING (is_client_for_agency(agency_id));
CREATE POLICY "client_insert_staff_members" ON public.staff_members FOR INSERT WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_update_staff_members" ON public.staff_members FOR UPDATE USING (is_client_for_agency(agency_id)) WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_delete_staff_members" ON public.staff_members FOR DELETE USING (is_client_for_agency(agency_id));

-- =============================
-- HEALTH_SAFETY_ITEMS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_health_safety_items" ON public.health_safety_items;
DROP POLICY IF EXISTS "client_insert_health_safety_items" ON public.health_safety_items;
DROP POLICY IF EXISTS "client_update_health_safety_items" ON public.health_safety_items;
DROP POLICY IF EXISTS "client_delete_health_safety_items" ON public.health_safety_items;

CREATE POLICY "client_select_health_safety_items" ON public.health_safety_items FOR SELECT USING (is_client_for_agency(agency_id));
CREATE POLICY "client_insert_health_safety_items" ON public.health_safety_items FOR INSERT WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_update_health_safety_items" ON public.health_safety_items FOR UPDATE USING (is_client_for_agency(agency_id)) WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_delete_health_safety_items" ON public.health_safety_items FOR DELETE USING (is_client_for_agency(agency_id));

-- =============================
-- B2B_COMPANIES (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_or_branch_manager_update_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_select_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_insert_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_update_own_b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "client_delete_own_b2b_companies" ON public.b2b_companies;

CREATE POLICY "client_select_own_b2b_companies" ON public.b2b_companies FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_b2b_companies" ON public.b2b_companies FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_b2b_companies" ON public.b2b_companies FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)))
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_b2b_companies" ON public.b2b_companies FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

-- =============================
-- B2B_REFERRALS (from migrations)
-- =============================
DROP POLICY IF EXISTS "client_or_branch_manager_select_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_insert_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_update_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_or_branch_manager_delete_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_select_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_insert_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_update_own_b2b_referrals" ON public.b2b_referrals;
DROP POLICY IF EXISTS "client_delete_own_b2b_referrals" ON public.b2b_referrals;

CREATE POLICY "client_select_own_b2b_referrals" ON public.b2b_referrals FOR SELECT
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

CREATE POLICY "client_insert_own_b2b_referrals" ON public.b2b_referrals FOR INSERT
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_update_own_b2b_referrals" ON public.b2b_referrals FOR UPDATE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)))
WITH CHECK (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id()));

CREATE POLICY "client_delete_own_b2b_referrals" ON public.b2b_referrals FOR DELETE
USING (is_client_for_agency(agency_id) AND (client_id IS NULL OR client_id = get_current_user_client_id() OR user_belongs_to_client(client_id)));

-- =============================
-- CLIENT_BRANCHES (from main schema - uses client_id not agency_id)
-- =============================
DROP POLICY IF EXISTS "client_select_own_client_branches" ON public.client_branches;
DROP POLICY IF EXISTS "client_insert_own_client_branches" ON public.client_branches;
DROP POLICY IF EXISTS "client_update_own_client_branches" ON public.client_branches;
DROP POLICY IF EXISTS "client_delete_own_client_branches" ON public.client_branches;

CREATE POLICY "client_select_own_client_branches" ON public.client_branches FOR SELECT
USING (client_id = get_current_user_client_id() OR user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_client_branches" ON public.client_branches FOR INSERT
WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "client_update_own_client_branches" ON public.client_branches FOR UPDATE
USING (client_id = get_current_user_client_id() OR user_belongs_to_client(client_id))
WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "client_delete_own_client_branches" ON public.client_branches FOR DELETE
USING (client_id = get_current_user_client_id() OR user_belongs_to_client(client_id));

-- =============================
-- CLIENT_STAFF (from main schema - uses client_id not agency_id)
-- =============================
DROP POLICY IF EXISTS "client_select_own_client_staff" ON public.client_staff;
DROP POLICY IF EXISTS "client_insert_own_client_staff" ON public.client_staff;
DROP POLICY IF EXISTS "client_update_own_client_staff" ON public.client_staff;
DROP POLICY IF EXISTS "client_delete_own_client_staff" ON public.client_staff;

CREATE POLICY "client_select_own_client_staff" ON public.client_staff FOR SELECT
USING (client_id = get_current_user_client_id() OR user_belongs_to_client(client_id));

CREATE POLICY "client_insert_own_client_staff" ON public.client_staff FOR INSERT
WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "client_update_own_client_staff" ON public.client_staff FOR UPDATE
USING (client_id = get_current_user_client_id() OR user_belongs_to_client(client_id))
WITH CHECK (client_id = get_current_user_client_id());

CREATE POLICY "client_delete_own_client_staff" ON public.client_staff FOR DELETE
USING (client_id = get_current_user_client_id() OR user_belongs_to_client(client_id));

-- =============================
-- REPORTS (from main schema)
-- =============================
DROP POLICY IF EXISTS "client_select_reports" ON public.reports;
DROP POLICY IF EXISTS "client_insert_reports" ON public.reports;
DROP POLICY IF EXISTS "client_update_reports" ON public.reports;
DROP POLICY IF EXISTS "client_delete_reports" ON public.reports;

CREATE POLICY "client_select_reports" ON public.reports FOR SELECT USING (is_client_for_agency(agency_id));
CREATE POLICY "client_insert_reports" ON public.reports FOR INSERT WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_update_reports" ON public.reports FOR UPDATE USING (is_client_for_agency(agency_id)) WITH CHECK (is_client_for_agency(agency_id));
CREATE POLICY "client_delete_reports" ON public.reports FOR DELETE USING (is_client_for_agency(agency_id));

-- =============================
-- MOVEMENT_NOTES (from main schema - uses movement_id)
-- =============================
DROP POLICY IF EXISTS "client_select_movement_notes" ON public.movement_notes;
DROP POLICY IF EXISTS "client_insert_movement_notes" ON public.movement_notes;
DROP POLICY IF EXISTS "client_update_movement_notes" ON public.movement_notes;
DROP POLICY IF EXISTS "client_delete_movement_notes" ON public.movement_notes;

CREATE POLICY "client_select_movement_notes" ON public.movement_notes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_notes.movement_id AND is_client_for_agency(m.agency_id)));

CREATE POLICY "client_insert_movement_notes" ON public.movement_notes FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_notes.movement_id AND is_client_for_agency(m.agency_id)));

CREATE POLICY "client_update_movement_notes" ON public.movement_notes FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_notes.movement_id AND is_client_for_agency(m.agency_id)));

CREATE POLICY "client_delete_movement_notes" ON public.movement_notes FOR DELETE
USING (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_notes.movement_id AND is_client_for_agency(m.agency_id)));

-- =============================
-- MOVEMENT_OFFERS (from main schema - uses movement_id)
-- =============================
DROP POLICY IF EXISTS "client_select_movement_offers" ON public.movement_offers;
DROP POLICY IF EXISTS "client_insert_movement_offers" ON public.movement_offers;
DROP POLICY IF EXISTS "client_update_movement_offers" ON public.movement_offers;
DROP POLICY IF EXISTS "client_delete_movement_offers" ON public.movement_offers;

CREATE POLICY "client_select_movement_offers" ON public.movement_offers FOR SELECT
USING (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_offers.movement_id AND is_client_for_agency(m.agency_id)));

CREATE POLICY "client_insert_movement_offers" ON public.movement_offers FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_offers.movement_id AND is_client_for_agency(m.agency_id)));

CREATE POLICY "client_update_movement_offers" ON public.movement_offers FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_offers.movement_id AND is_client_for_agency(m.agency_id)));

CREATE POLICY "client_delete_movement_offers" ON public.movement_offers FOR DELETE
USING (EXISTS (SELECT 1 FROM public.movements m WHERE m.id = movement_offers.movement_id AND is_client_for_agency(m.agency_id)));
