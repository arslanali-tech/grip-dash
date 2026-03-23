import { supabase } from '@/lib/supabaseClient';

export type HousekeepingRequestType =
  | 'holiday_request'
  | 'absence_request'
  | 'stationery_request'
  | 'invoice_request'
  | 'mileage_log'
  | 'staff_appraisal';

export interface HousekeepingRequestRow {
  id: string;
  agency_id: string;
  branch_id: string | null;
  request_type: HousekeepingRequestType;
  staff_id: string | null;
  staff_name: string | null;
  requested_by: string | null;
  payload: any | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StaffAppraisalPeriodValue {
  target: string;
  actual: string;
}

export interface StaffAppraisalMetricRow {
  id: string;
  category: string;
  metric: string;
  monthlyData: StaffAppraisalPeriodValue[];
  weeklyData?: StaffAppraisalPeriodValue[];
}

export interface StaffAppraisalPayload {
  requestId?: string;
  staffId?: string | null;
  staffEmail?: string | null;
  staffName: string;
  staffBranch: string;
  year: string;
  month: string;
  monthlyData: StaffAppraisalMetricRow[];
  weeklyData: StaffAppraisalMetricRow[];
  notes: string;
  completedBy?: string;
  completedAt?: string;
}

export interface StaffAppraisalRequestRow extends Omit<HousekeepingRequestRow, 'payload'> {
  payload: StaffAppraisalPayload | null;
}

const normalizeComparableValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

const isStaffAppraisalPayload = (payload: unknown): payload is StaffAppraisalPayload => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as Partial<StaffAppraisalPayload>;
  return (
    typeof candidate.staffName === 'string' &&
    typeof candidate.year === 'string' &&
    typeof candidate.month === 'string' &&
    Array.isArray(candidate.monthlyData) &&
    Array.isArray(candidate.weeklyData)
  );
};

const mapHousekeepingRowToStaffAppraisal = (
  row: HousekeepingRequestRow
): StaffAppraisalRequestRow | null => {
  if (row.request_type !== 'staff_appraisal') return null;

  const payload = isStaffAppraisalPayload(row.payload)
    ? { ...row.payload, requestId: row.id }
    : null;

  return {
    ...row,
    payload,
  };
};

export async function fetchHousekeepingRequests(input: {
  agencyId: string;
  branchId?: string;
  requestType?: HousekeepingRequestType;
  limit?: number;
}): Promise<HousekeepingRequestRow[]> {
  let q = supabase
    .from('housekeeping_requests')
    .select('*')
    .eq('agency_id', input.agencyId)
    .order('created_at', { ascending: false });

  if (input.branchId) {
    q = q.eq('branch_id', input.branchId);
  }
  if (input.requestType) {
    q = q.eq('request_type', input.requestType);
  }
  if (input.limit) {
    q = q.limit(input.limit);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error fetching housekeeping requests', error);
    return [];
  }
  return (data as HousekeepingRequestRow[]) ?? [];
}

export async function fetchStaffAppraisalRequests(input: {
  agencyId: string;
  branchId?: string;
  staffId?: string;
  staffName?: string;
  year?: string;
  month?: string;
  limit?: number;
}): Promise<StaffAppraisalRequestRow[]> {
  const rows = await fetchHousekeepingRequests({
    agencyId: input.agencyId,
    branchId: input.branchId,
    requestType: 'staff_appraisal',
  });

  const normalizedStaffId = normalizeComparableValue(input.staffId);
  const normalizedStaffName = normalizeComparableValue(input.staffName);
  const normalizedYear = normalizeComparableValue(input.year);
  const normalizedMonth = normalizeComparableValue(input.month);

  const filtered = rows
    .map(mapHousekeepingRowToStaffAppraisal)
    .filter((row): row is StaffAppraisalRequestRow => !!row)
    .filter((row) => {
      const payload = row.payload;
      const rowStaffId = normalizeComparableValue(row.staff_id ?? payload?.staffId);
      const rowStaffName = normalizeComparableValue(row.staff_name ?? payload?.staffName);
      const rowYear = normalizeComparableValue(payload?.year);
      const rowMonth = normalizeComparableValue(payload?.month);

      if (normalizedStaffId) {
        const matchesById = !!rowStaffId && rowStaffId === normalizedStaffId;
        const matchesByName =
          !rowStaffId && !!normalizedStaffName && rowStaffName === normalizedStaffName;

        if (!matchesById && !matchesByName) {
          return false;
        }
      }
      if (!normalizedStaffId && normalizedStaffName && rowStaffName !== normalizedStaffName) {
        return false;
      }
      if (normalizedYear && rowYear !== normalizedYear) {
        return false;
      }
      if (normalizedMonth && rowMonth !== normalizedMonth) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const rightTime = new Date(right.updated_at || right.created_at).getTime();
      const leftTime = new Date(left.updated_at || left.created_at).getTime();
      return rightTime - leftTime;
    });

  if (input.limit && input.limit > 0) {
    return filtered.slice(0, input.limit);
  }

  return filtered;
}

export async function fetchLatestStaffAppraisal(input: {
  agencyId: string;
  branchId?: string;
  staffId?: string;
  staffName?: string;
  year?: string;
  month?: string;
}): Promise<StaffAppraisalRequestRow | null> {
  const rows = await fetchStaffAppraisalRequests({
    ...input,
    limit: 1,
  });

  return rows[0] ?? null;
}

export async function fetchHousekeepingRequestById(id: string): Promise<HousekeepingRequestRow | null> {
  const { data, error } = await supabase
    .from('housekeeping_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching housekeeping request by id', error);
    return null;
  }

  return (data as HousekeepingRequestRow) ?? null;
}

export async function createHousekeepingRequest(
  input: Omit<
    HousekeepingRequestRow,
    'id' | 'created_at' | 'updated_at' | 'status' | 'payload'
  > & {
    payload?: any;
    status?: string;
  }
): Promise<HousekeepingRequestRow | null> {
  const { data, error } = await supabase
    .from('housekeeping_requests')
    .insert({
      agency_id: input.agency_id,
      branch_id: input.branch_id ?? null,
      request_type: input.request_type,
      staff_id: input.staff_id ?? null,
      staff_name: input.staff_name ?? null,
      requested_by: input.requested_by ?? null,
      payload: input.payload ?? null,
      status: input.status ?? 'pending',
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating housekeeping request', error);
    return null;
  }

  return (data as HousekeepingRequestRow) ?? null;
}

export async function updateHousekeepingRequest(
  id: string,
  input: Partial<Pick<HousekeepingRequestRow, 'status' | 'payload' | 'staff_id' | 'staff_name' | 'branch_id'>>
): Promise<HousekeepingRequestRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) payload.status = input.status;
  if (input.payload !== undefined) payload.payload = input.payload;
  if (input.staff_id !== undefined) payload.staff_id = input.staff_id;
  if (input.staff_name !== undefined) payload.staff_name = input.staff_name;
  if (input.branch_id !== undefined) payload.branch_id = input.branch_id;

  const { data, error } = await supabase
    .from('housekeeping_requests')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating housekeeping request', error);
    return null;
  }

  return (data as HousekeepingRequestRow) ?? null;
}

export async function deleteHousekeepingRequest(id: string): Promise<void> {
  const { error } = await supabase.from('housekeeping_requests').delete().eq('id', id);
  if (error) {
    console.error('Error deleting housekeeping request', error);
  }
}
