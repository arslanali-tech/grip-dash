import { supabase } from '@/lib/supabaseClient';

// ======================
// Commission Rules
// ======================

export interface CommissionRule {
  id: string;
  agencyId: string;
  branchId: string | null;
  name: string;
  description: string | null;
  ruleType: 'sales' | 'lettings' | 'both';
  commissionType: 'percentage' | 'fixed' | 'tiered';
  baseValue: number | null;
  tiers: CommissionTier[] | null;
  appliesToAgent: boolean;
  appliesToSalesProgressor: boolean;
  splitPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionTier {
  threshold: number;
  rate: number;
}

export interface CommissionRuleInput {
  branchId?: string | null;
  name: string;
  description?: string;
  ruleType: 'sales' | 'lettings' | 'both';
  commissionType: 'percentage' | 'fixed' | 'tiered';
  baseValue?: number;
  tiers?: CommissionTier[];
  appliesToAgent?: boolean;
  appliesToSalesProgressor?: boolean;
  splitPercentage?: number;
  isActive?: boolean;
}

const mapRuleRowToCommissionRule = (row: any): CommissionRule => ({
  id: row.id,
  agencyId: row.agency_id,
  branchId: row.branch_id,
  name: row.name,
  description: row.description,
  ruleType: row.rule_type,
  commissionType: row.commission_type,
  baseValue: row.base_value,
  tiers: row.tiers,
  appliesToAgent: row.applies_to_agent,
  appliesToSalesProgressor: row.applies_to_sales_progressor,
  splitPercentage: row.split_percentage,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function fetchCommissionRules(agencyId: string): Promise<CommissionRule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching commission rules', error);
    return [];
  }

  return (data || []).map(mapRuleRowToCommissionRule);
}

export async function fetchCommissionRuleById(ruleId: string): Promise<CommissionRule | null> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (error) {
    console.error('Error fetching commission rule', error);
    return null;
  }

  return mapRuleRowToCommissionRule(data);
}

export async function createCommissionRule(
  agencyId: string,
  input: CommissionRuleInput
): Promise<CommissionRule | null> {
  const { data, error } = await supabase
    .from('commission_rules')
    .insert({
      agency_id: agencyId,
      branch_id: input.branchId ?? null,
      name: input.name,
      description: input.description ?? null,
      rule_type: input.ruleType,
      commission_type: input.commissionType,
      base_value: input.baseValue ?? null,
      tiers: input.tiers ?? null,
      applies_to_agent: input.appliesToAgent ?? true,
      applies_to_sales_progressor: input.appliesToSalesProgressor ?? false,
      split_percentage: input.splitPercentage ?? 100,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating commission rule', error);
    return null;
  }

  return mapRuleRowToCommissionRule(data);
}

export async function updateCommissionRule(
  ruleId: string,
  input: Partial<CommissionRuleInput>
): Promise<CommissionRule | null> {
  const payload: Record<string, any> = {};

  if (input.branchId !== undefined) payload.branch_id = input.branchId;
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.ruleType !== undefined) payload.rule_type = input.ruleType;
  if (input.commissionType !== undefined) payload.commission_type = input.commissionType;
  if (input.baseValue !== undefined) payload.base_value = input.baseValue;
  if (input.tiers !== undefined) payload.tiers = input.tiers;
  if (input.appliesToAgent !== undefined) payload.applies_to_agent = input.appliesToAgent;
  if (input.appliesToSalesProgressor !== undefined) payload.applies_to_sales_progressor = input.appliesToSalesProgressor;
  if (input.splitPercentage !== undefined) payload.split_percentage = input.splitPercentage;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await supabase
    .from('commission_rules')
    .update(payload)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating commission rule', error);
    return null;
  }

  return mapRuleRowToCommissionRule(data);
}

export async function deleteCommissionRule(ruleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('commission_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting commission rule', error);
    return false;
  }

  return true;
}

// ======================
// Staff Commission Assignments
// ======================

export interface StaffCommissionAssignment {
  id: string;
  staffId: string;
  ruleId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  overrideValue: number | null;
  createdAt: string;
}

export interface StaffCommissionAssignmentInput {
  staffId: string;
  ruleId: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  overrideValue?: number | null;
}

const mapAssignmentRowToAssignment = (row: any): StaffCommissionAssignment => ({
  id: row.id,
  staffId: row.staff_id,
  ruleId: row.rule_id,
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
  overrideValue: row.override_value,
  createdAt: row.created_at,
});

export async function fetchStaffCommissionAssignments(staffId: string): Promise<StaffCommissionAssignment[]> {
  const { data, error } = await supabase
    .from('staff_commission_assignments')
    .select('*')
    .eq('staff_id', staffId)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('Error fetching staff commission assignments', error);
    return [];
  }

  return (data || []).map(mapAssignmentRowToAssignment);
}

export async function assignCommissionRuleToStaff(
  input: StaffCommissionAssignmentInput
): Promise<StaffCommissionAssignment | null> {
  const { data, error } = await supabase
    .from('staff_commission_assignments')
    .insert({
      staff_id: input.staffId,
      rule_id: input.ruleId,
      effective_from: input.effectiveFrom || new Date().toISOString().split('T')[0],
      effective_to: input.effectiveTo ?? null,
      override_value: input.overrideValue ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error assigning commission rule to staff', error);
    return null;
  }

  return mapAssignmentRowToAssignment(data);
}

export async function removeCommissionAssignment(assignmentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('staff_commission_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error removing commission assignment', error);
    return false;
  }

  return true;
}

// ======================
// Movement Commissions
// ======================

export interface MovementCommission {
  id: string;
  movementId: string;
  staffId: string | null;
  ruleId: string | null;
  staffName: string | null;
  commissionAmount: number;
  commissionType: string | null;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovementCommissionInput {
  movementId: string;
  staffId?: string | null;
  ruleId?: string | null;
  staffName?: string;
  commissionAmount: number;
  commissionType?: string;
  status?: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes?: string;
}

const mapMovementCommissionRow = (row: any): MovementCommission => ({
  id: row.id,
  movementId: row.movement_id,
  staffId: row.staff_id,
  ruleId: row.rule_id,
  staffName: row.staff_name,
  commissionAmount: row.commission_amount,
  commissionType: row.commission_type,
  status: row.status,
  notes: row.notes,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  paidAt: row.paid_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function fetchMovementCommissions(movementId: string): Promise<MovementCommission[]> {
  const { data, error } = await supabase
    .from('movement_commissions')
    .select('*')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movement commissions', error);
    return [];
  }

  return (data || []).map(mapMovementCommissionRow);
}

export async function fetchMovementCommissionsForStaff(
  staffId: string,
  movementIds: string[]
): Promise<MovementCommission[]> {
  if (!staffId || movementIds.length === 0) return [];
  const { data, error } = await supabase
    .from('movement_commissions')
    .select('*')
    .eq('staff_id', staffId)
    .in('movement_id', movementIds);

  if (error) {
    console.error('Error fetching movement commissions for staff', error);
    return [];
  }

  return (data || [])
    .map(mapMovementCommissionRow)
    .filter((row) => row.status !== 'cancelled');
}

export async function createMovementCommission(
  input: MovementCommissionInput
): Promise<MovementCommission | null> {
  const { data, error } = await supabase
    .from('movement_commissions')
    .insert({
      movement_id: input.movementId,
      staff_id: input.staffId ?? null,
      rule_id: input.ruleId ?? null,
      staff_name: input.staffName ?? null,
      commission_amount: input.commissionAmount,
      commission_type: input.commissionType ?? null,
      status: input.status ?? 'pending',
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating movement commission', error);
    return null;
  }

  return mapMovementCommissionRow(data);
}

export async function updateMovementCommissionStatus(
  commissionId: string,
  status: 'pending' | 'approved' | 'paid' | 'cancelled',
  notes?: string
): Promise<MovementCommission | null> {
  const payload: Record<string, any> = { status };

  if (status === 'approved') {
    const { data: session } = await supabase.auth.getSession();
    payload.approved_by = session?.session?.user?.id || null;
    payload.approved_at = new Date().toISOString();
  } else if (status === 'paid') {
    payload.paid_at = new Date().toISOString();
  }

  if (notes !== undefined) {
    payload.notes = notes;
  }

  const { data, error } = await supabase
    .from('movement_commissions')
    .update(payload)
    .eq('id', commissionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating movement commission status', error);
    return null;
  }

  return mapMovementCommissionRow(data);
}

export async function deleteMovementCommission(commissionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('movement_commissions')
    .delete()
    .eq('id', commissionId);

  if (error) {
    console.error('Error deleting movement commission', error);
    return false;
  }

  return true;
}

// ======================
// Commission Totals (Views)
// ======================

export interface StaffCommissionTotal {
  staffId: string;
  staffName: string;
  agencyId: string;
  branchName: string;
  paidCommission: number;
  approvedCommission: number;
  pendingCommission: number;
  totalCommission: number;
}

export interface BranchCommissionTotal {
  branchName: string;
  agencyId: string;
  paidCommission: number;
  approvedCommission: number;
  pendingCommission: number;
  totalCommission: number;
  staffCount: number;
}

export interface AgencyCommissionTotal {
  agencyId: string;
  paidCommission: number;
  approvedCommission: number;
  pendingCommission: number;
  totalCommission: number;
  staffCount: number;
  branchCount: number;
}

export async function fetchStaffCommissionTotals(agencyId: string): Promise<StaffCommissionTotal[]> {
  const { data, error } = await supabase
    .from('staff_commission_totals')
    .select('*')
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error fetching staff commission totals', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    staffId: row.staff_id,
    staffName: row.staff_name,
    agencyId: row.agency_id,
    branchName: row.branch_name,
    paidCommission: row.paid_commission,
    approvedCommission: row.approved_commission,
    pendingCommission: row.pending_commission,
    totalCommission: row.total_commission,
  }));
}

export async function fetchBranchCommissionTotals(agencyId: string): Promise<BranchCommissionTotal[]> {
  const { data, error } = await supabase
    .from('branch_commission_totals')
    .select('*')
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error fetching branch commission totals', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    branchName: row.branch_name,
    agencyId: row.agency_id,
    paidCommission: row.paid_commission,
    approvedCommission: row.approved_commission,
    pendingCommission: row.pending_commission,
    totalCommission: row.total_commission,
    staffCount: row.staff_count,
  }));
}

export async function fetchAgencyCommissionTotal(agencyId: string): Promise<AgencyCommissionTotal | null> {
  const { data, error } = await supabase
    .from('agency_commission_totals')
    .select('*')
    .eq('agency_id', agencyId)
    .single();

  if (error) {
    console.error('Error fetching agency commission total', error);
    return null;
  }

  return {
    agencyId: data.agency_id,
    paidCommission: data.paid_commission,
    approvedCommission: data.approved_commission,
    pendingCommission: data.pending_commission,
    totalCommission: data.total_commission,
    staffCount: data.staff_count,
    branchCount: data.branch_count,
  };
}

// ======================
// Commission Calculation Helper
// ======================

export function calculateCommission(
  rule: CommissionRule,
  dealValue: number,
  overrideValue?: number | null
): number {
  const value = overrideValue ?? rule.baseValue ?? 0;

  switch (rule.commissionType) {
    case 'fixed':
      return value;

    case 'percentage':
      return (dealValue * value) / 100;

    case 'tiered':
      if (!rule.tiers || rule.tiers.length === 0) {
        return 0;
      }
      // Sort tiers by threshold ascending
      const sortedTiers = [...rule.tiers].sort((a, b) => a.threshold - b.threshold);
      let commission = 0;
      let remainingValue = dealValue;

      for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        const tierCeiling = nextTier ? nextTier.threshold : Infinity;
        const applicableValue = Math.min(remainingValue, tierCeiling - tier.threshold);

        if (applicableValue > 0 && remainingValue > tier.threshold) {
          commission += (applicableValue * tier.rate) / 100;
          remainingValue -= applicableValue;
        }
      }

      return commission;

    default:
      return 0;
  }
}
