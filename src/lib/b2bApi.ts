import { supabase } from '@/lib/supabaseClient';

export interface B2BCompany {
  id: string;
  name: string;
  type: string;
  contact_name?: string;
  contact_email?: string;
  status?: string;
}

export async function fetchB2BCompanies(agencyId: string | null, clientId?: string): Promise<B2BCompany[]> {
  if (!agencyId) return [];
  let query = supabase
    .from('b2b_companies')
    .select('id, name, type, contact_name, contact_email, status')
    .eq('agency_id', agencyId)
    .in('status', ['active'])
    .order('name');

  // Filter by client_id if provided (for client users)
  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) {
    if ((error as any)?.code === '42P01' || (error as any)?.code === 'PGRST100') {
      return [];
    }
    console.warn('fetchB2BCompanies error', error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    type: row.type ?? 'Partner',
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    status: row.status,
  }));
}
