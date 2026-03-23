import { supabase } from '@/lib/supabaseClient';

export interface PropertyReferralRow {
  id: string;
  agency_id: string;
  branch_id: string | null;
  property_address: string;
  property_type: string | null;
  estimated_value: number | null;
  referral_type: string;
  direction: string;
  status: string;
  from_branch: string | null;
  to_branch: string | null;
  from_agent: string | null;
  to_agent: string | null;
  external_company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  referral_date: string;
  commission: number | null;
  created_at: string;
  updated_at: string;
}

export interface FetchReferralsResult {
  data: PropertyReferralRow[];
  tableExists: boolean;
  error?: string;
}

export async function fetchPropertyReferrals(agencyId: string, clientId?: string): Promise<FetchReferralsResult> {
  let query = supabase
    .from('property_referrals')
    .select('*')
    .eq('agency_id', agencyId)
    .order('referral_date', { ascending: false });

  // Filter by client_id if provided (for client users)
  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    // Check for table not found errors
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = (error as any)?.code || '';
    const isTableMissing = 
      errorCode === 'PGRST100' ||
      errorCode === '42P01' ||
      errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
      errorMessage.includes('schema cache') ||
      errorMessage.includes('not find the table');
    
    if (isTableMissing) {
      console.warn('property_referrals table not found');
      return { data: [], tableExists: false, error: 'Table not configured' };
    }
    
    console.error('Error fetching property referrals', error);
    return { data: [], tableExists: true, error: error.message };
  }

  return { data: (data as PropertyReferralRow[]) ?? [], tableExists: true };
}

export async function createPropertyReferral(
  agencyId: string,
  input: {
    branch_id?: string;
    property_address: string;
    property_type?: string;
    estimated_value?: number;
    referral_type: 'internal' | 'external';
    direction: 'sent' | 'received';
    status?: 'pending' | 'accepted' | 'rejected' | 'completed';
    from_branch?: string;
    to_branch?: string;
    from_agent?: string;
    to_agent?: string;
    external_company?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    notes?: string;
    referral_date: string;
    commission?: number;
  },
  clientId?: string
): Promise<PropertyReferralRow | null> {
  const { data, error } = await supabase
    .from('property_referrals')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      branch_id: input.branch_id ?? null,
      property_address: input.property_address,
      property_type: input.property_type ?? null,
      estimated_value: input.estimated_value ?? null,
      referral_type: input.referral_type,
      direction: input.direction,
      status: input.status ?? 'pending',
      from_branch: input.from_branch ?? null,
      to_branch: input.to_branch ?? null,
      from_agent: input.from_agent ?? null,
      to_agent: input.to_agent ?? null,
      external_company: input.external_company ?? null,
      contact_name: input.contact_name ?? null,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
      notes: input.notes ?? null,
      referral_date: input.referral_date,
      commission: input.commission ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    if ((error as any)?.status === 404 || (error as any)?.code === 'PGRST100') {
      console.warn('property_referrals table not found when creating referral');
      throw new Error('Referrals feature is not available. Please contact support.');
    } else if ((error as any)?.code === '42501') {
      // RLS policy violation
      console.error('Permission denied creating property referral', error);
      throw new Error('You do not have permission to send referrals. Please contact your administrator.');
    } else {
      console.error('Error creating property referral', error);
      throw new Error(error.message || 'Failed to send referral. Please try again.');
    }
  }

  return data as PropertyReferralRow;
}

export async function updatePropertyReferral(
  id: string,
  input: Partial<
    Pick<
      PropertyReferralRow,
      | 'branch_id'
      | 'property_address'
      | 'property_type'
      | 'estimated_value'
      | 'referral_type'
      | 'direction'
      | 'status'
      | 'from_branch'
      | 'to_branch'
      | 'from_agent'
      | 'to_agent'
      | 'external_company'
      | 'contact_name'
      | 'contact_email'
      | 'contact_phone'
      | 'notes'
      | 'referral_date'
      | 'commission'
    >
  >
): Promise<PropertyReferralRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.branch_id !== undefined) payload.branch_id = input.branch_id;
  if (input.property_address !== undefined) payload.property_address = input.property_address;
  if (input.property_type !== undefined) payload.property_type = input.property_type;
  if (input.estimated_value !== undefined) payload.estimated_value = input.estimated_value;
  if (input.referral_type !== undefined) payload.referral_type = input.referral_type;
  if (input.direction !== undefined) payload.direction = input.direction;
  if (input.status !== undefined) payload.status = input.status;
  if (input.from_branch !== undefined) payload.from_branch = input.from_branch;
  if (input.to_branch !== undefined) payload.to_branch = input.to_branch;
  if (input.from_agent !== undefined) payload.from_agent = input.from_agent;
  if (input.to_agent !== undefined) payload.to_agent = input.to_agent;
  if (input.external_company !== undefined) payload.external_company = input.external_company;
  if (input.contact_name !== undefined) payload.contact_name = input.contact_name;
  if (input.contact_email !== undefined) payload.contact_email = input.contact_email;
  if (input.contact_phone !== undefined) payload.contact_phone = input.contact_phone;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.referral_date !== undefined) payload.referral_date = input.referral_date;
  if (input.commission !== undefined) payload.commission = input.commission;

  const { data, error } = await supabase
    .from('property_referrals')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating property referral', error);
    return null;
  }

  return data as PropertyReferralRow;
}

export async function deletePropertyReferral(id: string): Promise<void> {
  const { error } = await supabase.from('property_referrals').delete().eq('id', id);
  if (error) {
    console.error('Error deleting property referral', error);
  }
}
