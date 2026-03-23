-- Create commission_rules table for defining reusable commission structures
-- Commission rules can be assigned to staff at branch or agency level

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.client_branches(id) ON DELETE CASCADE, -- NULL means agency-wide rule
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('sales', 'lettings', 'both')),
  -- Commission calculation
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
  base_value NUMERIC(10, 2), -- Base percentage or fixed amount
  -- Tiered commission thresholds (JSONB for flexibility)
  -- Format: [{"threshold": 100000, "rate": 1.5}, {"threshold": 200000, "rate": 2.0}]
  tiers JSONB,
  -- Applicability
  applies_to_agent BOOLEAN DEFAULT true, -- Applies to listing agent
  applies_to_sales_progressor BOOLEAN DEFAULT false, -- Applies to sales progressor
  split_percentage NUMERIC(5, 2) DEFAULT 100, -- For splits between agents
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff to commission rule assignments
CREATE TABLE IF NOT EXISTS public.staff_commission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.commission_rules(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL means indefinite
  override_value NUMERIC(10, 2), -- Optional override of the base_value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, rule_id, effective_from)
);

-- Calculated commissions on movements
CREATE TABLE IF NOT EXISTS public.movement_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.movements(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  staff_name TEXT, -- Denormalized for historical records
  commission_amount NUMERIC(12, 2) NOT NULL,
  commission_type TEXT, -- 'listing', 'sales_progression', 'split'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_rules_agency_id ON public.commission_rules(agency_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_branch_id ON public.commission_rules(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_commission_assignments_staff_id ON public.staff_commission_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_commission_assignments_rule_id ON public.staff_commission_assignments(rule_id);
CREATE INDEX IF NOT EXISTS idx_movement_commissions_movement_id ON public.movement_commissions(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_commissions_staff_id ON public.movement_commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_movement_commissions_status ON public.movement_commissions(status);

-- Enable RLS
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commission_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_rules

CREATE POLICY "Users can view commission rules in their agency" ON public.commission_rules
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.clients 
      WHERE id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
      UNION
      SELECT agency_id FROM public.agency_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can manage commission rules" ON public.commission_rules
  FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_admins 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for staff_commission_assignments

CREATE POLICY "Users can view commission assignments in their agency" ON public.staff_commission_assignments
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM public.staff_members 
      WHERE agency_id IN (
        SELECT agency_id FROM public.clients 
        WHERE id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
        UNION
        SELECT agency_id FROM public.agency_admins 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agency admins can manage commission assignments" ON public.staff_commission_assignments
  FOR ALL
  USING (
    staff_id IN (
      SELECT id FROM public.staff_members 
      WHERE agency_id IN (
        SELECT agency_id FROM public.agency_admins 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for movement_commissions

CREATE POLICY "Users can view movement commissions in their agency" ON public.movement_commissions
  FOR SELECT
  USING (
    movement_id IN (
      SELECT id FROM public.movements 
      WHERE agency_id IN (
        SELECT agency_id FROM public.clients 
        WHERE id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
        UNION
        SELECT agency_id FROM public.agency_admins 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agency admins can manage movement commissions" ON public.movement_commissions
  FOR ALL
  USING (
    movement_id IN (
      SELECT id FROM public.movements 
      WHERE agency_id IN (
        SELECT agency_id FROM public.agency_admins 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_commission_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movement_commissions TO authenticated;

-- Update trigger for commission_rules
CREATE OR REPLACE FUNCTION public.update_commission_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_commission_rules_updated_at ON public.commission_rules;
CREATE TRIGGER trigger_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_rules_updated_at();

-- Update trigger for movement_commissions
DROP TRIGGER IF EXISTS trigger_movement_commissions_updated_at ON public.movement_commissions;
CREATE TRIGGER trigger_movement_commissions_updated_at
  BEFORE UPDATE ON public.movement_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_rules_updated_at();

-- View for aggregated commission totals by staff
CREATE OR REPLACE VIEW public.staff_commission_totals AS
SELECT
  sm.id AS staff_id,
  sm.name AS staff_name,
  sm.agency_id,
  sm.branch_name,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'paid'), 0) AS paid_commission,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'approved'), 0) AS approved_commission,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'pending'), 0) AS pending_commission,
  COALESCE(SUM(mc.commission_amount), 0) AS total_commission
FROM public.staff_members sm
LEFT JOIN public.movement_commissions mc ON mc.staff_id = sm.id
GROUP BY sm.id, sm.name, sm.agency_id, sm.branch_name;

GRANT SELECT ON public.staff_commission_totals TO authenticated;

-- View for branch-level commission totals
CREATE OR REPLACE VIEW public.branch_commission_totals AS
SELECT
  sm.branch_name,
  sm.agency_id,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'paid'), 0) AS paid_commission,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'approved'), 0) AS approved_commission,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'pending'), 0) AS pending_commission,
  COALESCE(SUM(mc.commission_amount), 0) AS total_commission,
  COUNT(DISTINCT sm.id) AS staff_count
FROM public.staff_members sm
LEFT JOIN public.movement_commissions mc ON mc.staff_id = sm.id
GROUP BY sm.branch_name, sm.agency_id;

GRANT SELECT ON public.branch_commission_totals TO authenticated;

-- View for agency-level commission totals
CREATE OR REPLACE VIEW public.agency_commission_totals AS
SELECT
  sm.agency_id,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'paid'), 0) AS paid_commission,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'approved'), 0) AS approved_commission,
  COALESCE(SUM(mc.commission_amount) FILTER (WHERE mc.status = 'pending'), 0) AS pending_commission,
  COALESCE(SUM(mc.commission_amount), 0) AS total_commission,
  COUNT(DISTINCT sm.id) AS staff_count,
  COUNT(DISTINCT sm.branch_name) AS branch_count
FROM public.staff_members sm
LEFT JOIN public.movement_commissions mc ON mc.staff_id = sm.id
GROUP BY sm.agency_id;

GRANT SELECT ON public.agency_commission_totals TO authenticated;
