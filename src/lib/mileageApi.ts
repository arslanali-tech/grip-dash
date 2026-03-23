import { supabase } from '@/lib/supabaseClient';

export interface MileageLogRow {
  id: string;
  agency_id: string;
  client_id: string | null;
  branch_id: string | null;
  staff_id: string | null;
  diary_event_id: string | null;
  task_id: string | null;
  start_location: string;
  end_location: string;
  distance: number;
  is_return_trip: boolean;
  total_distance: number;
  logged_at: string;
  created_at: string;
}

export interface FetchMileageLogsInput {
  agencyId: string;
  clientId?: string | null;
  branchId?: string | null;
  staffId?: string | null;
  from?: string;
  to?: string;
  limit?: number;
}

export async function fetchMileageLogs(input: FetchMileageLogsInput): Promise<MileageLogRow[]> {
  let q = supabase
    .from('mileage_logs')
    .select('*')
    .eq('agency_id', input.agencyId)
    .order('logged_at', { ascending: false });

  // Filter by client_id for client data isolation
  if (input.clientId) q = q.eq('client_id', input.clientId);
  if (input.branchId) q = q.eq('branch_id', input.branchId);
  if (input.staffId) q = q.eq('staff_id', input.staffId);
  if (input.from) q = q.gte('logged_at', input.from);
  if (input.to) q = q.lte('logged_at', input.to);
  if (input.limit) q = q.limit(input.limit);

  const { data, error } = await q;
  if (error) {
    console.error('Error fetching mileage logs', error);
    return [];
  }
  return (data as MileageLogRow[]) ?? [];
}

export interface CreateMileageLogInput {
  agency_id: string;
  client_id?: string | null;
  branch_id?: string | null;
  staff_id?: string | null;
  diary_event_id?: string | null;
  task_id?: string | null;
  start_location: string;
  end_location: string;
  distance: number;
  is_return_trip: boolean;
  total_distance: number;
  logged_at?: string;
}

export async function createMileageLog(input: CreateMileageLogInput): Promise<MileageLogRow | null> {
  const { data, error } = await supabase
    .from('mileage_logs')
    .insert({
      agency_id: input.agency_id,
      client_id: input.client_id ?? null,
      branch_id: input.branch_id ?? null,
      staff_id: input.staff_id ?? null,
      diary_event_id: input.diary_event_id ?? null,
      task_id: input.task_id ?? null,
      start_location: input.start_location,
      end_location: input.end_location,
      distance: input.distance,
      is_return_trip: input.is_return_trip,
      total_distance: input.total_distance,
      logged_at: input.logged_at ?? new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating mileage log', error);
    return null;
  }

  return (data as MileageLogRow) ?? null;
}

export async function deleteMileageLog(id: string): Promise<void> {
  const { error } = await supabase.from('mileage_logs').delete().eq('id', id);
  if (error) {
    console.error('Error deleting mileage log', error);
  }
}
