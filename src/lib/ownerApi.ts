import { supabase } from '@/lib/supabaseClient';
import { mapStaffRoleToAppRole } from '@/lib/staffRoles';

const DOCUSIGN_TEMPLATE_ID = (import.meta.env.VITE_DOCUSIGN_TEMPLATE_ID as string | undefined)?.trim();
const DOCUSIGN_USE_DOCUMENT =
  ((import.meta.env.VITE_DOCUSIGN_USE_DOCUMENT as string | undefined)?.toLowerCase() ?? 'false') === 'true';
const DOCUSIGN_DOCUMENT_PATH = (import.meta.env.VITE_DOCUSIGN_DOCUMENT_PATH as string | undefined)?.trim();

export interface Agency {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  owner_user_id: string;
  created_at: string;
}

export interface ClientRow {
  id: string;
  agency_id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: string | null;
  package: string | null;
  franchise_super_user_access: boolean | null;
  franchise_group_id: string | null;
  franchise_group_name: string | null;
  enabled_modules: any | null;
  created_at: string;
}

// =============================
// Client-level branches & staff (per client)
// =============================

export interface ClientBranchRow {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  enabled_modules: any | null;
  created_at: string;
}

export interface ClientStaffRow {
  id: string;
  client_id: string;
  branch_id: string | null;
  name: string;
  email: string;
  role: string;
  enabled_modules: any | null;
  basic_wage?: number | null;
  employer_nics?: number | null;
  employer_pension?: number | null;
  holiday_allowance?: number | null;
  commission_breakdown?: any | null;
  prospector_dashboard_config?: any | null;
  created_at: string;
}

export interface FranchiseGroupRow {
  id: string;
  agency_id: string;
  name: string;
  super_user_client_id: string | null;
  created_at: string;
}

export interface FranchiseClientSummary {
  id: string;
  name: string;
  franchise_super_user_access: boolean | null;
  franchise_group_id: string | null;
}

const isMissingClientStaffColumnError = (error: any): boolean => {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  const mentionsColumn =
    text.includes('basic_wage') ||
    text.includes('employer_nics') ||
    text.includes('employer_pension') ||
    text.includes('holiday_allowance') ||
    text.includes('commission_breakdown') ||
    text.includes('prospector_dashboard_config');
  const indicatesMissingColumn =
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('could not find the') ||
    text.includes('column') ||
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST100';

  return mentionsColumn && indicatesMissingColumn;
};

const stripClientStaffCompFields = (payload: Record<string, unknown>) => {
  const {
    basic_wage,
    employer_nics,
    employer_pension,
    holiday_allowance,
    commission_breakdown,
    prospector_dashboard_config,
    ...rest
  } = payload;
  return rest;
};

const isMissingClientFranchiseColumnError = (error: any): boolean => {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  const mentionsColumn =
    text.includes('franchise_super_user_access') ||
    text.includes('franchise_group_id') ||
    text.includes('franchise_group_name');
  const indicatesMissingColumn =
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('could not find the') ||
    text.includes('column') ||
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST100';

  return mentionsColumn && indicatesMissingColumn;
};

const stripClientFranchiseFields = (payload: Record<string, unknown>) => {
  const {
    franchise_super_user_access,
    franchise_group_id,
    franchise_group_name,
    ...rest
  } = payload;
  return rest;
};

const normalizeFranchiseGroupName = (name: string) => name.trim().toLowerCase();

const normalizeClientIds = (clientIds: string | string[] | undefined | null): string[] => {
  if (!clientIds) return [];
  const list = Array.isArray(clientIds) ? clientIds : [clientIds];
  return Array.from(new Set(list.map((id) => id.trim()).filter(Boolean)));
};

export async function fetchFranchiseGroupForClient(clientId: string): Promise<FranchiseGroupRow | null> {
  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('franchise_group_id')
    .eq('id', clientId)
    .maybeSingle();

  if (clientError) {
    console.warn('Error fetching client franchise group id', clientError);
    return null;
  }

  const groupId = (clientRow as any)?.franchise_group_id as string | null | undefined;
  if (!groupId) return null;

  return fetchFranchiseGroupById(groupId);
}

export async function fetchFranchiseGroupsForAgency(agencyId: string): Promise<FranchiseGroupRow[]> {
  const { data, error } = await supabase
    .from('franchise_groups')
    .select('*')
    .eq('agency_id', agencyId)
    .order('name', { ascending: true });

  if (error) {
    console.warn('Error fetching franchise groups', error);
    return [];
  }

  return (data as FranchiseGroupRow[]) ?? [];
}

export async function fetchFranchiseGroupById(groupId: string): Promise<FranchiseGroupRow | null> {
  const { data, error } = await supabase
    .from('franchise_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching franchise group', error);
    return null;
  }

  return (data as FranchiseGroupRow) ?? null;
}

export async function getOrCreateFranchiseGroup(
  agencyId: string,
  name: string,
  superUserClientId?: string | null
): Promise<FranchiseGroupRow | null> {
  const normalized = normalizeFranchiseGroupName(name);
  if (!normalized) return null;

  const existingGroups = await fetchFranchiseGroupsForAgency(agencyId);
  const existing = existingGroups.find((group) => normalizeFranchiseGroupName(group.name) === normalized);
  if (existing) {
    if (superUserClientId && !existing.super_user_client_id) {
      const { data, error } = await supabase
        .from('franchise_groups')
        .update({ super_user_client_id: superUserClientId })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (!error && data) {
        return data as FranchiseGroupRow;
      }
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('franchise_groups')
    .insert({
      agency_id: agencyId,
      name: name.trim(),
      super_user_client_id: superUserClientId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.warn('Error creating franchise group', error);
    return null;
  }

  return data as FranchiseGroupRow;
}

export async function clearClientFranchiseGroup(clientId: string): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from('clients')
    .update({
      franchise_super_user_access: false,
      franchise_group_id: null,
      franchise_group_name: null,
    })
    .eq('id', clientId)
    .select('*')
    .single();

  if (error) {
    console.warn('Error clearing client franchise group', error);
    return null;
  }

  return data as ClientRow;
}

export async function attachClientToFranchiseGroup(input: {
  clientId: string;
  agencyId: string;
  groupName: string;
  superUserClientId?: string | null;
}): Promise<ClientRow | null> {
  const group = await getOrCreateFranchiseGroup(
    input.agencyId,
    input.groupName,
    input.superUserClientId ?? input.clientId
  );
  if (!group) return null;

  const { data, error } = await supabase
    .from('clients')
    .update({
      franchise_super_user_access: true,
      franchise_group_id: group.id,
      franchise_group_name: group.name,
    })
    .eq('id', input.clientId)
    .select('*')
    .single();

  if (error) {
    console.warn('Error attaching client to franchise group', error);
    return null;
  }

  if (!group.super_user_client_id) {
    await supabase
      .from('franchise_groups')
      .update({ super_user_client_id: input.superUserClientId ?? input.clientId })
      .eq('id', group.id);
  }

  return data as ClientRow;
}

// Reusable role templates for client staff (role name -> enabled modules)
export interface ClientStaffRoleRow {
  id: string;
  client_id: string;
  name: string;
  enabled_modules: any | null;
  created_at: string;
}

export async function fetchClientStaffRoles(clientId: string): Promise<ClientStaffRoleRow[]> {
  const { data, error } = await supabase
    .from('client_staff_roles')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true });

  if (error) {
    console.warn('Error fetching client staff roles', error);
    return [];
  }

  return (data as ClientStaffRoleRow[]) ?? [];
}

export async function upsertClientStaffRole(
  clientId: string,
  input: { name: string; enabled_modules?: any }
): Promise<ClientStaffRoleRow | null> {
  const name = input.name?.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from('client_staff_roles')
    .upsert(
      {
        client_id: clientId,
        name,
        enabled_modules: input.enabled_modules ?? null,
      },
      { onConflict: 'client_id,name' }
    )
    .select('*')
    .single();

  if (error) {
    console.warn('Error upserting client staff role', error);
    return null;
  }

  return data as ClientStaffRoleRow;
}

export async function deleteClientStaffRole(id: string): Promise<void> {
  const { error } = await supabase.from('client_staff_roles').delete().eq('id', id);
  if (error) {
    console.warn('Error deleting client staff role', error);
  }
}

export async function getOrCreateOwnerAgency(ownerUserId: string): Promise<Agency | null> {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching owner agency', error);
    return null;
  }

  if (data) return data as Agency;

  const { data: created, error: insertError } = await supabase
    .from('agencies')
    .insert({
      name: 'GRIP Owner Agency',
      owner_user_id: ownerUserId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Error creating owner agency', insertError);
    return null;
  }

  return created as Agency;
}

export async function fetchClientsForAgency(agencyId: string): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients', error);
    return [];
  }

  return (data as ClientRow[]) ?? [];
}

export async function fetchClientsInFranchiseGroup(groupId: string): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('franchise_group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching franchise group clients', error);
    return [];
  }

  return (data as ClientRow[]) ?? [];
}

export async function fetchFranchiseClientsForClient(clientId: string): Promise<FranchiseClientSummary[]> {
  const group = await fetchFranchiseGroupForClient(clientId);
  if (!group) {
    const { data: clientRow, error } = await supabase
      .from('clients')
      .select('id, name, franchise_super_user_access, franchise_group_id')
      .eq('id', clientId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching fallback franchise client summary', error);
      return [];
    }

    return clientRow
      ? [{
          id: clientRow.id,
          name: clientRow.name,
          franchise_super_user_access: clientRow.franchise_super_user_access ?? false,
          franchise_group_id: clientRow.franchise_group_id ?? null,
        }]
      : [];
  }

  const rows = await fetchClientsInFranchiseGroup(group.id);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    franchise_super_user_access: row.franchise_super_user_access ?? false,
    franchise_group_id: row.franchise_group_id ?? null,
  }));
}

export interface CreateClientInput {
  name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: string;
  package?: string;
  franchise_super_user_access?: boolean;
  franchise_group_id?: string;
  franchise_group_name?: string;
  enabled_modules?: string[];
}

export async function createClientForAgency(
  agencyId: string,
  input: CreateClientInput
): Promise<ClientRow | null> {
  let { data, error } = await supabase
    .from('clients')
    .insert({
      agency_id: agencyId,
      name: input.name,
      contact_name: input.contact_name ?? null,
      email: input.email,
      phone: input.phone ?? null,
      address: input.address ?? null,
      status: input.status ?? 'active',
      package: input.package ?? 'Standard',
      franchise_super_user_access: input.franchise_super_user_access ?? false,
      franchise_group_id: input.franchise_group_id ?? null,
      franchise_group_name: input.franchise_group_name ?? null,
      enabled_modules: input.enabled_modules ?? null,
    })
    .select('*')
    .single();

  if (error && isMissingClientFranchiseColumnError(error)) {
    ({ data, error } = await supabase
      .from('clients')
      .insert(
        stripClientFranchiseFields({
          agency_id: agencyId,
          name: input.name,
          contact_name: input.contact_name ?? null,
          email: input.email,
          phone: input.phone ?? null,
          address: input.address ?? null,
          status: input.status ?? 'active',
          package: input.package ?? 'Standard',
          enabled_modules: input.enabled_modules ?? null,
        })
      )
      .select('*')
      .single());
  }

  if (error) {
    console.error('Error creating client', error);
    return null;
  }

  if (data && (input.franchise_super_user_access || input.franchise_group_id || input.franchise_group_name?.trim())) {
    const existingGroupId = input.franchise_group_id?.trim();
    if (existingGroupId) {
      const group = await fetchFranchiseGroupById(existingGroupId);
      if (group) {
        const linked = await supabase
          .from('clients')
          .update({
            franchise_super_user_access: true,
            franchise_group_id: group.id,
            franchise_group_name: group.name,
          })
          .eq('id', (data as ClientRow).id)
          .select('*')
          .single();
        if (!linked.error && linked.data) {
          data = linked.data as ClientRow;
        }
      }
    } else {
      const groupName = input.franchise_group_name?.trim() || input.name.trim();
      const linked = await attachClientToFranchiseGroup({
        clientId: (data as ClientRow).id,
        agencyId,
        groupName,
      });

      if (linked) {
        data = linked;
      }
    }
  }

  return data as ClientRow;
}

export async function getOrCreateClientForAgencyByEmail(
  agencyId: string,
  input: CreateClientInput
): Promise<{ client: ClientRow; created: boolean } | null> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const { data: existing, error } = await supabase
    .from('clients')
    .select('*')
    .eq('agency_id', agencyId)
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error finding client by email', error);
    return null;
  }

  if (existing) {
    return { client: existing as ClientRow, created: false };
  }

  const created = await createClientForAgency(agencyId, { ...input, email: normalizedEmail });
  if (!created) return null;

  return { client: created, created: true };
}

export async function updateClient(
  id: string,
  input: Partial<CreateClientInput>
): Promise<ClientRow | null> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.contact_name !== undefined) payload.contact_name = input.contact_name;
  if (input.email !== undefined) payload.email = input.email;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.address !== undefined) payload.address = input.address;
  if (input.status !== undefined) payload.status = input.status;
  if (input.package !== undefined) payload.package = input.package;
  if (input.franchise_super_user_access !== undefined) payload.franchise_super_user_access = input.franchise_super_user_access;
  if (input.franchise_group_id !== undefined) payload.franchise_group_id = input.franchise_group_id;
  if (input.franchise_group_name !== undefined) payload.franchise_group_name = input.franchise_group_name;
  if (input.enabled_modules !== undefined) payload.enabled_modules = input.enabled_modules;

  let { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error && isMissingClientFranchiseColumnError(error)) {
    ({ data, error } = await supabase
      .from('clients')
      .update(stripClientFranchiseFields(payload))
      .eq('id', id)
      .select('*')
      .single());
  }

  if (error) {
    console.error('Error updating client', error);
    return null;
  }

  if (data) {
    const existing = data as ClientRow;
    if (input.franchise_super_user_access === false) {
      if (existing.franchise_group_id) {
        const group = await fetchFranchiseGroupById(existing.franchise_group_id);
        if (group) {
          const members = await fetchClientsInFranchiseGroup(group.id);
          const replacement = members.find((member) => member.id !== existing.id) ?? null;
          await supabase
            .from('franchise_groups')
            .update({ super_user_client_id: replacement?.id ?? null })
            .eq('id', group.id);
        }
      }
      const cleared = await clearClientFranchiseGroup(existing.id);
      if (cleared) {
        data = cleared;
      }
    } else if (input.franchise_super_user_access || input.franchise_group_id || input.franchise_group_name?.trim()) {
      const existingGroupId = input.franchise_group_id?.trim() || existing.franchise_group_id || null;
      if (existingGroupId) {
        const group = await fetchFranchiseGroupById(existingGroupId);
        if (group) {
          const linked = await supabase
            .from('clients')
            .update({
              franchise_super_user_access: true,
              franchise_group_id: group.id,
              franchise_group_name: group.name,
            })
            .eq('id', existing.id)
            .select('*')
            .single();
          if (!linked.error && linked.data) {
            data = linked.data as ClientRow;
          }
        }
      } else {
        const groupName = input.franchise_group_name?.trim() || existing.franchise_group_name?.trim() || existing.name.trim();
        const linked = await attachClientToFranchiseGroup({
          clientId: existing.id,
          agencyId: existing.agency_id,
          groupName,
        });
        if (linked) {
          data = linked;
        }
      }
    }
  }

  return data as ClientRow;
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    // First get all branch IDs for this client to clean up references
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', id);
    
    const branchIds = (branches ?? []).map((b: { id: string }) => b.id);

    // Delete all records that reference branches
    if (branchIds.length > 0) {
      // Clear branch_id references in client_staff first
      await supabase
        .from('client_staff')
        .update({ branch_id: null })
        .in('branch_id', branchIds);

      // Delete/clear ALL tables that reference client_branches
      // These are all the tables with branch_id FK to client_branches
      const optionalDeletes = [
        // B2B
        () => supabase.from('b2b_referrals').delete().in('branch_id', branchIds),
        () => supabase.from('b2b_companies').delete().in('branch_id', branchIds),
        // Goals & meetings
        () => supabase.from('branch_goals').delete().in('branch_id', branchIds),
        () => supabase.from('branch_meetings').delete().eq('client_id', id),
        // Commission
        () => supabase.from('commission_rules').delete().in('branch_id', branchIds),
        // Health & Safety
        () => supabase.from('health_safety_items').delete().in('branch_id', branchIds),
        // Diary, tasks, mileage
        () => supabase.from('diary_events').delete().in('branch_id', branchIds),
        () => supabase.from('tasks').delete().in('branch_id', branchIds),
        () => supabase.from('mileage_logs').delete().in('branch_id', branchIds),
        // Hub documents
        () => supabase.from('hub_documents').delete().in('branch_id', branchIds),
        () => supabase.from('hub_folders').delete().in('branch_id', branchIds),
        // Team chat
        () => supabase.from('team_messages').delete().in('branch_id', branchIds),
        () => supabase.from('team_channels').delete().in('branch_id', branchIds),
        // Property referrals
        () => supabase.from('property_referrals').delete().in('branch_id', branchIds),
        // Movements & prospects (clear branch_id, don't delete)
        () => supabase.from('movements').update({ branch_id: null }).in('branch_id', branchIds),
        () => supabase.from('prospects').update({ branch_id: null }).in('branch_id', branchIds),
      ];

      for (const run of optionalDeletes) {
        const { error } = await run();
        if (error) {
          // Ignore missing table / no policy errors
          const code = (error as any)?.code;
          const status = (error as any)?.status;
          if (code !== 'PGRST116' && code !== '404' && status !== 404) {
            console.warn('Optional delete failed:', error);
          }
        }
      }
    }

    // Delete client staff
    const { error: staffError } = await supabase
      .from('client_staff')
      .delete()
      .eq('client_id', id);
    
    if (staffError) {
      console.error('Error deleting client staff', staffError);
      throw new Error(`Failed to delete client staff: ${staffError.message}`);
    }

    // Delete client staff roles
    const { error: rolesError } = await supabase
      .from('client_staff_roles')
      .delete()
      .eq('client_id', id);
    
    if (rolesError) {
      console.error('Error deleting client staff roles', rolesError);
      // Continue - this table might not exist
    }

    // Delete client branches
    const { error: branchError } = await supabase
      .from('client_branches')
      .delete()
      .eq('client_id', id);
    
    if (branchError) {
      console.error('Error deleting client branches', branchError);
      // Log the full error to help debug
      console.error('Branch deletion error details:', JSON.stringify(branchError, null, 2));
      throw new Error(`Failed to delete client branches: ${branchError.message}`);
    }

    // Finally delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client', error);
      throw new Error(`Failed to delete client: ${error.message}`);
    }

    return true;
  } catch (err) {
    console.error('Client deletion failed:', err);
    return false;
  }
}

export async function fetchClientBranches(clientId: string | string[]): Promise<ClientBranchRow[]> {
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length === 0) return [];

  if (clientIds.length > 1) {
    const { data, error } = await supabase
      .from('client_branches')
      .select('*')
      .in('client_id', clientIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching client branches', error);
      return [];
    }

    return (data as ClientBranchRow[]) ?? [];
  }

  const { data, error } = await supabase
    .from('client_branches')
    .select('*')
    .eq('client_id', clientIds[0])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching client branches', error);
    return [];
  }

  return (data as ClientBranchRow[]) ?? [];
}

export async function fetchClientBranchesForAgency(agencyId: string): Promise<ClientBranchRow[]> {
  const { data, error } = await supabase
    .from('client_branches')
    .select('*, clients!inner(agency_id)')
    .eq('clients.agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching client branches for agency', error);
    return [];
  }

  return (data as ClientBranchRow[]) ?? [];
}

/**
 * Returns the maximum number of branches configured for a client (if any),
 * based on the latest signup order row. Returns null when no limit is stored.
 *
 * Note: This relies on signup_orders.client_id being populated or, as a
 * fallback, a case-insensitive email match.
 */
export async function fetchBranchLimitForClient(
  clientId: string,
  clientEmail?: string | null
): Promise<number | null> {
  let query = supabase
    .from('signup_orders')
    .select('branches, client_id, email')
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  } else if (clientEmail) {
    query = query.ilike('email', clientEmail.toLowerCase());
  } else {
    return null;
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.warn('Error fetching branch limit for client', error);
    return null;
  }

  const raw = (data as any)?.branches;
  const limit = Number(raw);
  return Number.isFinite(limit) ? limit : null;
}
export async function createClientBranch(
  clientId: string,
  input: { name: string; address?: string; phone?: string; email?: string; enabled_modules?: any }
): Promise<ClientBranchRow | null> {
  const { data, error } = await supabase
    .from('client_branches')
    .insert({
      client_id: clientId,
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      enabled_modules: input.enabled_modules ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating client branch', error?.message ?? error);
    return null;
  }

  return data as ClientBranchRow;
}

export async function updateClientBranch(
  id: string,
  input: Partial<Pick<ClientBranchRow, 'name' | 'address' | 'phone' | 'email' | 'enabled_modules'>>
): Promise<ClientBranchRow | null> {
  const { data, error } = await supabase
    .from('client_branches')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating client branch', error);
    return null;
  }

  return data as ClientBranchRow;
}

export async function deleteClientBranch(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_branches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting client branch', error);
  }
}

export async function fetchClientStaffForClient(clientId: string | string[]): Promise<ClientStaffRow[]> {
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length === 0) return [];

  if (clientIds.length > 1) {
    const { data, error } = await supabase
      .from('client_staff')
      .select('*')
      .in('client_id', clientIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching client staff', error);
      return [];
    }

    return (data as ClientStaffRow[]) ?? [];
  }

  const { data, error } = await supabase
    .from('client_staff')
    .select('*')
    .eq('client_id', clientIds[0])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching client staff', error);
    return [];
  }

  return (data as ClientStaffRow[]) ?? [];
}

export async function fetchClientStaffForAgency(agencyId: string, branchId?: string): Promise<ClientStaffRow[]> {
  let query = supabase
    .from('client_staff')
    .select('*, clients!inner(agency_id)')
    .eq('clients.agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching client staff for agency', error);
    return [];
  }

  return (data as ClientStaffRow[]) ?? [];
}

export async function createClientStaff(
  clientId: string,
  input: {
    branch_id?: string | null;
    name: string;
    email: string;
    role: string;
    enabled_modules?: any;
    basic_wage?: number | null;
    employer_nics?: number | null;
    employer_pension?: number | null;
    holiday_allowance?: number | null;
    commission_breakdown?: any | null;
    prospector_dashboard_config?: any | null;
  }
): Promise<ClientStaffRow | null> {
  // Debug: Log what we're trying to insert
  console.log('[createClientStaff] Attempting to insert:', {
    client_id: clientId,
    branch_id: input.branch_id ?? null,
    name: input.name,
    email: input.email,
    role: input.role,
  });

  // Debug: Check current user's session
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session) {
    console.log('[createClientStaff] Current user:', {
      userId: sessionData.session.user.id,
      email: sessionData.session.user.email,
      user_metadata: sessionData.session.user.user_metadata,
    });
    console.log('[createClientStaff] Full user_metadata:', JSON.stringify(sessionData.session.user.user_metadata, null, 2));
  }

  // Check if this user exists as a branch manager in client_staff
  const { data: existingStaff } = await supabase
    .from('client_staff')
    .select('*')
    .eq('client_id', clientId)
    .ilike('email', sessionData?.session?.user.email || '')
    .maybeSingle();
  console.log('[createClientStaff] Branch manager record in client_staff:', existingStaff);
  
  // Check what client_id we're trying to insert for
  console.log('[createClientStaff] Inserting for client_id:', clientId);
  console.log('[createClientStaff] User metadata client_id:', sessionData?.session?.user.user_metadata?.client_id);
  
  // Test: Try a direct query to see if RLS allows SELECT
  const { data: testSelect, error: testSelectError } = await supabase
    .from('client_staff')
    .select('id')
    .eq('client_id', clientId)
    .limit(1);
  console.log('[createClientStaff] Test SELECT result:', { success: !testSelectError, data: testSelect, error: testSelectError });

  const payload: Record<string, unknown> = {
    client_id: clientId,
    branch_id: input.branch_id ?? null,
    name: input.name,
    email: input.email,
    role: input.role,
    enabled_modules: input.enabled_modules ?? null,
    basic_wage: input.basic_wage ?? null,
    employer_nics: input.employer_nics ?? null,
    employer_pension: input.employer_pension ?? null,
    holiday_allowance: input.holiday_allowance ?? null,
    commission_breakdown: input.commission_breakdown ?? null,
    prospector_dashboard_config: input.prospector_dashboard_config ?? null,
  };

  let { data, error } = await supabase
    .from('client_staff')
    .insert(payload)
    .select('*')
    .single();

  if (error && isMissingClientStaffColumnError(error)) {
    const fallbackPayload = stripClientStaffCompFields(payload);
    ({ data, error } = await supabase
      .from('client_staff')
      .insert(fallbackPayload)
      .select('*')
      .single());
  }

  if (error) {
    console.error('[createClientStaff] Error creating client staff:', error);
    return null;
  }

  console.log('[createClientStaff] Successfully created:', data);
  return data as ClientStaffRow;
}

/**
 * Creates a client staff member and sends them an invitation email to set up their
 * account password. Returns the created staff row on success, or null on failure.
 */
export async function createClientStaffAndInvite(
  clientId: string,
  agencyId: string,
  input: { branch_id?: string | null; name: string; email: string; role: string; enabled_modules?: any }
): Promise<{ staff: ClientStaffRow | null; inviteSent: boolean }> {
  // First create the staff record
  const staff = await createClientStaff(clientId, input);

  if (!staff) {
    return { staff: null, inviteSent: false };
  }

  // Map the staff role to an invitation role
  const invitationRole = mapStaffRoleToAppRole(input.role);

  // Send the invitation email
  try {
    await inviteUserByEmail(input.email, invitationRole, agencyId, {
      staff_id: staff.id,
      client_id: clientId,
      branch_id: input.branch_id ?? null,
      name: input.name,
      invited_as: 'client_staff',
    });
    return { staff, inviteSent: true };
  } catch (e) {
    console.error('Error sending staff invitation email', e);
    // Staff was created but invite failed - still return the staff
    return { staff, inviteSent: false };
  }
}

/**
 * Resends an invitation email to an existing client staff member.
 */
export async function resendClientStaffInvite(
  staff: ClientStaffRow,
  agencyId: string
): Promise<boolean> {
  // Map the staff role to an invitation role
  const invitationRole = mapStaffRoleToAppRole(staff.role);

  try {
    await inviteUserByEmail(staff.email, invitationRole, agencyId, {
      staff_id: staff.id,
      client_id: staff.client_id,
      branch_id: staff.branch_id ?? null,
      name: staff.name,
      invited_as: 'client_staff',
    });
    return true;
  } catch (e) {
    console.error('Error resending staff invitation email', e);
    return false;
  }
}

export async function updateClientStaff(
  id: string,
  input: Partial<
    Pick<
      ClientStaffRow,
      | 'branch_id'
      | 'name'
      | 'email'
      | 'role'
      | 'enabled_modules'
      | 'basic_wage'
      | 'employer_nics'
      | 'employer_pension'
      | 'holiday_allowance'
      | 'commission_breakdown'
      | 'prospector_dashboard_config'
    >
  >
): Promise<ClientStaffRow | null> {
  let { data, error } = await supabase
    .from('client_staff')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error && isMissingClientStaffColumnError(error)) {
    const fallbackPayload = stripClientStaffCompFields(input as Record<string, unknown>);
    ({ data, error } = await supabase
      .from('client_staff')
      .update(fallbackPayload)
      .eq('id', id)
      .select('*')
      .single());
  }

  if (error) {
    console.error('Error updating client staff', error);
    return null;
  }

  return data as ClientStaffRow;
}

export async function deleteClientStaff(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_staff')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting client staff', error);
  }
}

// =============================
// Branches (agency & business structure)
// =============================

export interface BranchRow {
  id: string;
  agency_id: string;
  name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  manager: string | null;
  team_size: number | null;
  active_listings: number | null;
  total_sales: number | null;
  phone: string | null;
  email: string | null;
  status?: string | null;
  enabled_modules?: any | null;
  created_at: string;
}

export async function fetchBranches(agencyId: string): Promise<BranchRow[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching branches', error);
    return [];
  }

  return (data as BranchRow[]) ?? [];
}

export async function createBranch(
  agencyId: string,
  input: {
    name: string;
    address?: string;
    city?: string;
    postcode?: string;
    manager?: string;
    teamSize?: number;
    activeListings?: number;
    totalSales?: number;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive';
    enabledModules?: string[];
  }
): Promise<BranchRow | null> {
  const { data, error } = await supabase
    .from('branches')
    .insert({
      agency_id: agencyId,
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      postcode: input.postcode ?? null,
      manager: input.manager ?? null,
      team_size: input.teamSize ?? 0,
      active_listings: input.activeListings ?? 0,
      total_sales: input.totalSales ?? 0,
      phone: input.phone ?? null,
      email: input.email ?? null,
      status: input.status ?? 'active',
      enabled_modules: input.enabledModules ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating branch', error);
    return null;
  }

  return data as BranchRow;
}

export async function updateBranch(
  id: string,
  input: {
    name?: string;
    address?: string;
    city?: string;
    postcode?: string;
    manager?: string;
    teamSize?: number;
    activeListings?: number;
    totalSales?: number;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive';
    enabledModules?: string[];
  }
): Promise<BranchRow | null> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.address !== undefined) payload.address = input.address;
  if (input.city !== undefined) payload.city = input.city;
  if (input.postcode !== undefined) payload.postcode = input.postcode;
  if (input.manager !== undefined) payload.manager = input.manager;
  if (input.teamSize !== undefined) payload.team_size = input.teamSize;
  if (input.activeListings !== undefined) payload.active_listings = input.activeListings;
  if (input.totalSales !== undefined) payload.total_sales = input.totalSales;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.email !== undefined) payload.email = input.email;
  if (input.status !== undefined) payload.status = input.status;
  if (input.enabledModules !== undefined) payload.enabled_modules = input.enabledModules;

  const { data, error } = await supabase
    .from('branches')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating branch', error);
    return null;
  }

  return data as BranchRow;
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting branch', error);
  }
}

// =============================
// Staff members (agency staff management)
// =============================

export interface StaffMemberRow {
  id: string;
  agency_id: string;
  name: string;
  role: string;
  branch_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  basic_wage: number | null;
  employer_nics: number | null;
  employer_pension: number | null;
  holiday_allowance: number | null;
  commission_breakdown: any | null;
  created_at: string;
  updated_at: string;
}

export async function fetchStaffMembers(agencyId: string): Promise<StaffMemberRow[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching staff members', error);
    return [];
  }

  return (data as StaffMemberRow[]) ?? [];
}

export async function createStaffMember(
  agencyId: string,
  input: {
    name: string;
    role: string;
    branchName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    status?: 'active' | 'away' | 'offline';
    basicWage?: number;
    employerNICs?: number;
    employerPension?: number;
    holidayAllowance?: number;
    commissionBreakdown?: any;
  }
): Promise<StaffMemberRow | null> {
  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      agency_id: agencyId,
      name: input.name,
      role: input.role,
      branch_name: input.branchName,
      email: input.email,
      phone: input.phone ?? null,
      avatar_url: input.avatarUrl ?? null,
      status: input.status ?? 'active',
      basic_wage: input.basicWage ?? null,
      employer_nics: input.employerNICs ?? null,
      employer_pension: input.employerPension ?? null,
      holiday_allowance: input.holidayAllowance ?? null,
      commission_breakdown: input.commissionBreakdown ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating staff member', error);
    return null;
  }

  return data as StaffMemberRow;
}

export async function updateStaffMember(
  id: string,
  input: {
    name?: string;
    role?: string;
    branchName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    status?: 'active' | 'away' | 'offline';
    basicWage?: number;
    employerNICs?: number;
    employerPension?: number;
    holidayAllowance?: number;
    commissionBreakdown?: any;
  }
): Promise<StaffMemberRow | null> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.role !== undefined) payload.role = input.role;
  if (input.branchName !== undefined) payload.branch_name = input.branchName;
  if (input.email !== undefined) payload.email = input.email;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
  if (input.status !== undefined) payload.status = input.status;
  if (input.basicWage !== undefined) payload.basic_wage = input.basicWage;
  if (input.employerNICs !== undefined) payload.employer_nics = input.employerNICs;
  if (input.employerPension !== undefined) payload.employer_pension = input.employerPension;
  if (input.holidayAllowance !== undefined) payload.holiday_allowance = input.holidayAllowance;
  if (input.commissionBreakdown !== undefined) payload.commission_breakdown = input.commissionBreakdown;

  const { data, error } = await supabase
    .from('staff_members')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating staff member', error);
    return null;
  }

  return data as StaffMemberRow;
}

export async function deleteStaffMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('staff_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting staff member', error);
  }
}

// =============================
// Business Manager sections configuration
// =============================

export interface AgencyBusinessSectionRow {
  id: string;
  agency_id: string;
  key: string;
  label: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
}

const DEFAULT_BUSINESS_SECTIONS: { key: string; label: string; sort_order: number }[] = [
  { key: 'business-management', label: 'Business Management', sort_order: 10 },
  { key: 'company-flow', label: 'Company Flow', sort_order: 20 },
  { key: 'branches', label: 'Branches', sort_order: 30 },
  { key: 'staff', label: 'Staff', sort_order: 40 },
  { key: 'b2b-referrals', label: 'B2B Referrals', sort_order: 50 },
  { key: 'health-safety', label: 'Health & Safety', sort_order: 60 },
  { key: 'house-keeping', label: 'House Keeping', sort_order: 70 },
];

export async function fetchBusinessSections(agencyId: string): Promise<AgencyBusinessSectionRow[]> {
  const { data, error } = await supabase
    .from('agency_business_sections')
    .select('*')
    .eq('agency_id', agencyId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching business sections', {
      code: (error as any)?.code,
      status: (error as any)?.status,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    });
    return [];
  }

  return (data as AgencyBusinessSectionRow[]) ?? [];
}

export async function ensureDefaultBusinessSections(agencyId: string): Promise<AgencyBusinessSectionRow[]> {
  const existing = await fetchBusinessSections(agencyId);
  if (existing.length > 0) {
    return existing;
  }

  const toInsert = DEFAULT_BUSINESS_SECTIONS.map((s) => ({
    agency_id: agencyId,
    key: s.key,
    label: s.label,
    sort_order: s.sort_order,
  }));

  const { data, error } = await supabase
    .from('agency_business_sections')
    .insert(toInsert)
    .select('*');

  if (error) {
    // 403 Forbidden means user doesn't have permission, which is not an error we should worry about
    const code = (error as any)?.code;
    const status = (error as any)?.status;
    const message = (error as any)?.message || '';

    if (code === 'PGRST116' || status === 403 || code === '42501' || /permission/i.test(message)) {
      console.warn('User does not have permission to create business sections, using empty array', { code, status, message });
      return [];
    }

    console.error('Error inserting default business sections', { code, status, message, details: (error as any)?.details });
    return [];
  }

  return (data as AgencyBusinessSectionRow[]) ?? [];
}

export type InvitationRole =
  | 'agency_admin'
  | 'client'
  | 'branch_manager'
  | 'negotiator'
  | 'prospector'
  // Allow custom roles for client staff (e.g. "senior negotiator")
  | (string & {});

export interface InvitationRow {
  id: string;
  email: string;
  role: string;
  agency_id: string | null;
  status: string | null;
  created_at: string;
  expires_at: string | null;
  // Optional columns (recommended to add in DB schema)
  metadata?: any | null;
  last_sent_at?: string | null;
  sent_count?: number | null;
  accepted_at?: string | null;
  accepted_user_id?: string | null;
}

export async function fetchInvitationsForAgency(agencyId: string): Promise<InvitationRow[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations', error);
    return [];
  }

  return (data as InvitationRow[]) ?? [];
}

export async function inviteUserByEmail(
  email: string,
  role: InvitationRole,
  agencyId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const effectiveMetadata: Record<string, unknown> = { ...(metadata ?? {}) };
  if (agencyId && effectiveMetadata.agency_id == null) {
    effectiveMetadata.agency_id = agencyId;
  }

  try {
    // 1) Store / update invitation row (if we have an agency context)
    if (agencyId) {
      // Prefer updating an existing pending invite to avoid duplicates.
      const { data: existing, error: existingError } = await supabase
        .from('invitations')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.warn('Could not look up existing invitation (continuing):', existingError.message);
      }

      if (existing) {
        const currentCount = Number((existing as any).sent_count ?? 0);
        const mergedMetadata = {
          ...(((existing as any).metadata as Record<string, unknown> | null) ?? {}),
          ...effectiveMetadata,
        };

        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            role,
            status: 'pending',
            expires_at: expiresAtIso,
            last_sent_at: nowIso,
            sent_count: currentCount + 1,
            metadata: mergedMetadata,
          })
          .eq('id', (existing as any).id);

        if (updateError) {
          console.error('Error updating invitation', updateError);
          // Fall back to a minimal insert if schema columns are missing.
          const { error: fallbackError } = await supabase
            .from('invitations')
            .insert({ email: normalizedEmail, role, agency_id: agencyId });
          if (fallbackError) {
            console.error('Error inserting invitation (fallback)', fallbackError);
          }
        }
      } else {
        const payload: Record<string, unknown> = {
          email: normalizedEmail,
          role,
          agency_id: agencyId,
          status: 'pending',
          expires_at: expiresAtIso,
          last_sent_at: nowIso,
          sent_count: 1,
        };
        if (Object.keys(effectiveMetadata).length > 0) {
          payload.metadata = effectiveMetadata;
        }

        const { error: insertError } = await supabase.from('invitations').insert(payload);
        if (insertError) {
          console.error('Error inserting invitation', insertError);
          // Fall back to a minimal insert if schema columns are missing.
          const { error: fallbackError } = await supabase
            .from('invitations')
            .insert({ email: normalizedEmail, role, agency_id: agencyId });
          if (fallbackError) {
            console.error('Error inserting invitation (fallback)', fallbackError);
          }
        }
      }
    }

    // 2) Send OTP / magic link email
    // For invited users, redirect to the password set screen so they can create a password
    // and later log in via email/password.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin + '/reset-password',
        shouldCreateUser: true,
        // When a brand new user is created, store role/metadata directly on their profile.
        // (Existing users won't be updated by this; we also sync via invitations on sign-in.)
        data: {
          ...effectiveMetadata,
          role,
        },
      },
    });

    if (error) {
      console.error('Error sending OTP email', error);
    }
  } catch (e) {
    console.error('Unexpected error during invite', e);
  }
}

export async function resendInvitation(invitation: Pick<InvitationRow, 'email' | 'role' | 'agency_id' | 'metadata'>) {
  return inviteUserByEmail(
    invitation.email,
    (invitation.role as InvitationRole) ?? 'prospector',
    invitation.agency_id ?? undefined,
    (invitation.metadata as Record<string, unknown> | undefined) ?? undefined
  );
}
export interface MagicLinkSendResult {
  sent: boolean;
  reason?: 'client_exists' | 'error' | 'rate_limited';
  errorMessage?: string;
  clientId?: string | null;
}

/**
 * Sends a Supabase magic link to the client if they are not already present
 * in the `clients` table for the agency. Records an invitation and sets the
 * role to `client`.
 */
export async function sendMagicLinkToClientIfNeeded(input: {
  email: string;
  agencyId: string;
  metadata?: Record<string, unknown>;
  redirectToPath?: string;
  clientIdOverride?: string | null;
  forceSend?: boolean;
}): Promise<MagicLinkSendResult> {
  const normalizedEmail = input.email.trim().toLowerCase();

  try {
    const { data: existingClient, error: clientLookupError } = await supabase
      .from('clients')
      .select('id, email')
      .eq('agency_id', input.agencyId)
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (clientLookupError && clientLookupError.code !== 'PGRST116') {
      console.warn('Could not check existing client before sending magic link', clientLookupError);
    }

    if (existingClient) {
      if (!input.forceSend) {
        return { sent: false, reason: 'client_exists', clientId: (existingClient as any)?.id ?? null };
      }
    }

    const effectiveClientId = input.clientIdOverride ?? (existingClient as any)?.id ?? null;
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      invited_via: 'signup_order',
    };
    if (effectiveClientId && metadata.client_id == null) {
      metadata.client_id = effectiveClientId;
    }

    await inviteUserByEmail(normalizedEmail, 'client', input.agencyId, metadata);

    // inviteUserByEmail already sends the OTP / magic link.
    // Avoid sending a second OTP here to prevent Supabase 429 rate limiting.
    return { sent: true, clientId: effectiveClientId };
  } catch (e) {
    console.error('Unexpected error sending magic link to client', e);
    return { sent: false, reason: 'error', errorMessage: (e as Error)?.message, clientId: input.clientIdOverride ?? null };
  }
}

// Owner prospects (estate agent prospects managed by GRIP Owner)
export interface OwnerProspectRow {
  id: string;
  agency_id: string;
  added_date: string;
  name: string;
  agency: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  last_interaction_type: string | null;
  last_interaction_date: string | null;
  last_interaction_notes: string | null;
}

export async function fetchOwnerProspects(agencyId: string): Promise<OwnerProspectRow[]> {
  const { data, error } = await supabase
    .from('owner_prospects')
    .select('*')
    .eq('agency_id', agencyId)
    .order('added_date', { ascending: false });

  if (error) {
    console.error('Error fetching owner prospects', error);
    return [];
  }

  return (data as OwnerProspectRow[]) ?? [];
}

export async function createOwnerProspect(
  agencyId: string,
  input: {
    added_date?: string;
    name: string;
    agency: string;
    email: string;
    phone?: string;
    address?: string;
    status?: string;
  }
): Promise<OwnerProspectRow | null> {
  const { data, error } = await supabase
    .from('owner_prospects')
    .insert({
      agency_id: agencyId,
      added_date: input.added_date ?? new Date().toISOString().slice(0, 10),
      name: input.name,
      agency: input.agency,
      email: input.email,
      phone: input.phone ?? null,
      address: input.address ?? null,
      status: input.status ?? 'prospect',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating owner prospect', error);
    return null;
  }

  return data as OwnerProspectRow;
}

export async function updateOwnerProspectStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('owner_prospects')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating owner prospect status', error);
  }
}

export async function updateOwnerProspectLastInteraction(
  id: string,
  input: { type: string; date: string; notes?: string }
): Promise<void> {
  const { error } = await supabase
    .from('owner_prospects')
    .update({
      last_interaction_type: input.type,
      last_interaction_date: input.date,
      last_interaction_notes: input.notes ?? null,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating owner prospect interaction', error);
  }
}

export async function deleteOwnerProspect(id: string): Promise<void> {
  const { error } = await supabase.from('owner_prospects').delete().eq('id', id);
  if (error) {
    console.error('Error deleting owner prospect', error);
  }
}

// Client updates (broadcasts / direct messages)
export interface ClientUpdateRow {
  id: string;
  agency_id: string;
  type: string; // 'update' | 'message'
  recipients: string; // 'all' | 'active' | 'beta' | etc.
  subject: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

export async function fetchClientUpdates(agencyId: string): Promise<ClientUpdateRow[]> {
  const { data, error } = await supabase
    .from('client_updates')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching client updates', error);
    return [];
  }

  return (data as ClientUpdateRow[]) ?? [];
}

export async function createClientUpdate(
  agencyId: string,
  input: { type: 'update' | 'message'; recipients: string; subject: string; content: string; createdBy?: string }
): Promise<ClientUpdateRow | null> {
  const { data, error } = await supabase
    .from('client_updates')
    .insert({
      agency_id: agencyId,
      type: input.type,
      recipients: input.recipients,
      subject: input.subject,
      content: input.content,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating client update', error);
    return null;
  }

  return data as ClientUpdateRow;
}

// Support tickets
export interface SupportTicketRow {
  id: string;
  agency_id: string | null;
  client: string;
  subject: string;
  status: string; // 'open' | 'in-progress' | 'resolved'
  priority: string; // 'low' | 'medium' | 'high'
  created_at: string;
}

export async function fetchSupportTickets(agencyId?: string): Promise<SupportTicketRow[]> {
  let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching support tickets', error);
    return [];
  }
  return (data as SupportTicketRow[]) ?? [];
}

export async function createSupportTicket(
  agencyId: string | null,
  input: { client: string; subject: string; status?: string; priority?: string }
): Promise<SupportTicketRow | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      agency_id: agencyId,
      client: input.client,
      subject: input.subject,
      status: input.status ?? 'open',
      priority: input.priority ?? 'medium',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating support ticket', error);
    return null;
  }

  return data as SupportTicketRow;
}

// =============================
// Owner dashboard: metrics & analytics
// =============================

export interface OwnerMetricsRow {
  id: string;
  agency_id: string;
  grip_revenue: number | null;
  grip_revenue_change: number | null;
  signups: number | null;
  signups_change: number | null;
  branches: number | null;
  movements: number | null;
  movements_change: number | null;
  client_revenue: number | null;
  client_revenue_change: number | null;
  prospects: number | null;
  prospects_change: number | null;
  prospects_converted: number | null;
  prospects_converted_change: number | null;
  snapshot_date: string;
}

export async function fetchOwnerMetrics(agencyId: string): Promise<OwnerMetricsRow | null> {
  const { data, error } = await supabase
    .from('owner_metrics')
    .select('*')
    .eq('agency_id', agencyId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching owner metrics', error);
    return null;
  }

  return (data as OwnerMetricsRow) ?? null;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthStartIso(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * Live (computed) owner metrics derived from existing tables.
 * This is useful when `owner_metrics` has not been populated yet.
 */
export async function fetchOwnerMetricsLive(agencyId: string): Promise<OwnerMetricsRow | null> {
  try {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Keep queries light: pull only the columns needed for aggregation.
    const [branchesRes, clientsRes, prospectsRes, subsRes] = await Promise.all([
      supabase
        .from('branches')
        .select('created_at, active_listings, total_sales')
        .eq('agency_id', agencyId),
      supabase.from('clients').select('created_at').eq('agency_id', agencyId),
      supabase
        .from('owner_prospects')
        .select('added_date, status')
        .eq('agency_id', agencyId),
      supabase
        .from('subscriptions')
        .select('created_at, amount, status')
        .eq('agency_id', agencyId),
    ]);

    if (branchesRes.error) {
      console.error('Error computing owner metrics (branches)', branchesRes.error);
      return null;
    }
    if (clientsRes.error) {
      console.error('Error computing owner metrics (clients)', clientsRes.error);
      return null;
    }
    if (prospectsRes.error) {
      console.error('Error computing owner metrics (owner_prospects)', prospectsRes.error);
      return null;
    }
    if (subsRes.error) {
      console.error('Error computing owner metrics (subscriptions)', subsRes.error);
      return null;
    }

    const branches = (branchesRes.data as any[]) ?? [];
    const clients = (clientsRes.data as any[]) ?? [];
    const prospects = (prospectsRes.data as any[]) ?? [];
    const subs = (subsRes.data as any[]) ?? [];

    const branchesTotal = branches.length;

    const movementsTotal = branches.reduce((sum, b) => sum + Number(b.active_listings ?? 0), 0);
    const clientRevenueTotal = branches.reduce((sum, b) => sum + Number(b.total_sales ?? 0), 0);

    const signupsTotal = clients.length;

    const prospectsTotal = prospects.length;
    const prospectsConvertedTotal = prospects.filter((p) => String(p.status ?? '').toLowerCase() === 'signed-up').length;

    const activeSubs = subs.filter((s) => String(s.status ?? '').toLowerCase() === 'active');
    const gripRevenueTotal = activeSubs.reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

    // 30-day deltas (best-effort)
    const clientsIn30 = clients.filter((c) => {
      const dt = toDate(c.created_at);
      return dt ? dt >= d30 : false;
    }).length;
    const clientsPrev30 = clients.filter((c) => {
      const dt = toDate(c.created_at);
      return dt ? dt >= d60 && dt < d30 : false;
    }).length;

    const prospectsIn30 = prospects.filter((p) => {
      const dt = toDate(p.added_date);
      return dt ? dt >= d30 : false;
    }).length;
    const prospectsPrev30 = prospects.filter((p) => {
      const dt = toDate(p.added_date);
      return dt ? dt >= d60 && dt < d30 : false;
    }).length;

    const prospectsConvertedIn30 = prospects.filter((p) => {
      const dt = toDate(p.added_date);
      const isConverted = String(p.status ?? '').toLowerCase() === 'signed-up';
      return isConverted && dt ? dt >= d30 : false;
    }).length;
    const prospectsConvertedPrev30 = prospects.filter((p) => {
      const dt = toDate(p.added_date);
      const isConverted = String(p.status ?? '').toLowerCase() === 'signed-up';
      return isConverted && dt ? dt >= d60 && dt < d30 : false;
    }).length;

    const newGripRevenueIn30 = activeSubs
      .filter((s) => {
        const dt = toDate(s.created_at);
        return dt ? dt >= d30 : false;
      })
      .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

    const newGripRevenuePrev30 = activeSubs
      .filter((s) => {
        const dt = toDate(s.created_at);
        return dt ? dt >= d60 && dt < d30 : false;
      })
      .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

    const today = now.toISOString().slice(0, 10);

    return {
      id: 'live',
      agency_id: agencyId,
      snapshot_date: today,
      grip_revenue: gripRevenueTotal,
      grip_revenue_change: percentChange(newGripRevenueIn30, newGripRevenuePrev30),
      signups: signupsTotal,
      signups_change: percentChange(clientsIn30, clientsPrev30),
      branches: branchesTotal,
      movements: movementsTotal,
      movements_change: null,
      client_revenue: clientRevenueTotal,
      client_revenue_change: null,
      prospects: prospectsTotal,
      prospects_change: percentChange(prospectsIn30, prospectsPrev30),
      prospects_converted: prospectsConvertedTotal,
      prospects_converted_change: percentChange(prospectsConvertedIn30, prospectsConvertedPrev30),
    };
  } catch (e) {
    console.error('Unexpected error computing owner metrics', e);
    return null;
  }
}

export async function upsertOwnerMetrics(agencyId: string, partial: Partial<Omit<OwnerMetricsRow, 'id' | 'agency_id' | 'snapshot_date'>>): Promise<OwnerMetricsRow | null> {
  const payload = {
    agency_id: agencyId,
    ...partial,
  };

  const { data, error } = await supabase
    .from('owner_metrics')
    .upsert(payload, { onConflict: 'agency_id,snapshot_date' })
    .select('*')
    .single();

  if (error) {
    console.error('Error upserting owner metrics', error);
    return null;
  }

  return data as OwnerMetricsRow;
}

export interface RevenuePointRow {
  id: string;
  agency_id: string;
  series_type: 'grip' | 'client';
  period: string;
  revenue: number;
  period_start: string | null;
}

export async function fetchRevenueSeries(
  agencyId: string,
  series: 'grip' | 'client',
  from?: string,
  to?: string
): Promise<RevenuePointRow[]> {
  let query = supabase
    .from('owner_revenue_timeseries')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('series_type', series)
    .order('period_start', { ascending: true });

  if (from) {
    query = query.gte('period_start', from);
  }
  if (to) {
    query = query.lte('period_start', to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching revenue series', error);
    return [];
  }

  return (data as RevenuePointRow[]) ?? [];
}

/**
 * Fetches revenue series from the dedicated timeseries table, but falls back to a live computation
 * if no rows exist yet.
 */
export async function fetchRevenueSeriesDynamic(
  agencyId: string,
  series: 'grip' | 'client',
  from?: string,
  to?: string
): Promise<RevenuePointRow[]> {
  const existing = await fetchRevenueSeries(agencyId, series, from, to);
  if (existing.length > 0) return existing;

  // No timeseries rows yet -> compute from base tables.
  try {
    if (series === 'grip') {
      let q = supabase
        .from('subscriptions')
        .select('created_at, amount, status')
        .eq('agency_id', agencyId)
        .eq('status', 'active');

      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to);

      const { data, error } = await q;
      if (error) {
        console.error('Error computing grip revenue series from subscriptions', error);
        return [];
      }

      const rows = (data as any[]) ?? [];
      const buckets = new Map<string, { date: Date; sum: number }>();

      for (const r of rows) {
        const dt = toDate(r.created_at);
        if (!dt) continue;
        const key = monthKey(dt);
        const prev = buckets.get(key);
        const amount = Number(r.amount ?? 0);
        if (prev) {
          prev.sum += amount;
        } else {
          buckets.set(key, { date: new Date(dt.getFullYear(), dt.getMonth(), 1), sum: amount });
        }
      }

      return Array.from(buckets.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((b) => ({
          id: `computed-grip-${monthKey(b.date)}`,
          agency_id: agencyId,
          series_type: 'grip',
          period: monthLabel(b.date),
          revenue: b.sum,
          period_start: monthStartIso(b.date),
        }));
    }

    // client series fallback: sum branches.total_sales by created_at month
    let q = supabase
      .from('branches')
      .select('created_at, total_sales')
      .eq('agency_id', agencyId);

    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data, error } = await q;
    if (error) {
      console.error('Error computing client revenue series from branches', error);
      return [];
    }

    const rows = (data as any[]) ?? [];
    const buckets = new Map<string, { date: Date; sum: number }>();

    for (const r of rows) {
      const dt = toDate(r.created_at);
      if (!dt) continue;
      const key = monthKey(dt);
      const prev = buckets.get(key);
      const amount = Number(r.total_sales ?? 0);
      if (prev) {
        prev.sum += amount;
      } else {
        buckets.set(key, { date: new Date(dt.getFullYear(), dt.getMonth(), 1), sum: amount });
      }
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((b) => ({
        id: `computed-client-${monthKey(b.date)}`,
        agency_id: agencyId,
        series_type: 'client',
        period: monthLabel(b.date),
        revenue: b.sum,
        period_start: monthStartIso(b.date),
      }));
  } catch (e) {
    console.error('Unexpected error computing revenue series', e);
    return [];
  }
}

// =============================
// Owner dashboard: subscriptions (BillingView)
// =============================

export interface SubscriptionRow {
  id: string;
  agency_id: string;
  client_id: string | null;
  plan: string;
  amount: number;
  currency: string | null;
  status: string;
  next_billing_date: string | null;
  created_at: string;
}

export async function fetchSubscriptions(agencyId: string): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscriptions', error);
    return [];
  }

  return (data as SubscriptionRow[]) ?? [];
}

export async function createSubscription(
  agencyId: string,
  input: { client_id?: string | null; plan: string; amount: number; currency?: string; status?: string; next_billing_date?: string | null }
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      agency_id: agencyId,
      client_id: input.client_id ?? null,
      plan: input.plan,
      amount: input.amount,
      currency: input.currency ?? 'GBP',
      status: input.status ?? 'active',
      next_billing_date: input.next_billing_date ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating subscription', error);
    return null;
  }

  return data as SubscriptionRow;
}

export async function updateSubscription(
  id: string,
  input: Partial<Pick<SubscriptionRow, 'client_id' | 'plan' | 'amount' | 'currency' | 'status' | 'next_billing_date'>>
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating subscription', error);
    return null;
  }

  return data as SubscriptionRow;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting subscription', error);
  }
}

// =============================
// Owner dashboard: client invoices
// =============================

export interface ClientInvoiceRow {
  id: string;
  agency_id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  pdf_url: string | null;
  created_at: string;
}

export async function fetchClientInvoices(clientId: string): Promise<ClientInvoiceRow[]> {
  const { data, error } = await supabase
    .from('client_invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('invoice_date', { ascending: false });

  if (error) {
    console.error('Error fetching client invoices', error);
    return [];
  }

  return (data as ClientInvoiceRow[]) ?? [];
}

// =============================
// Owner dashboard: orders (Create Order)
// =============================
export interface DocuSignTemplate {
  templateId: string;
  name: string;
}

export async function fetchDocuSignTemplates(): Promise<DocuSignTemplate[]> {
  const { data, error } = await supabase.functions.invoke('docusign-list-templates', {});

  if (error) {
    console.error('Error fetching DocuSign templates', error);
    return [];
  }

  return ((data as any)?.templates as DocuSignTemplate[]) ?? [];
}

export interface DocuSignEnvelopeResponse {
  envelopeId?: string;
  status?: string;
  uri?: string;
}

export async function sendSignupOrderAgreement(input: {
  recipientEmail: string;
  recipientName: string;
  templateId?: string;
  roleName?: string;
  emailSubject?: string;
  useDocument?: boolean;
  documentPath?: string;
  documentUrl?: string;
  documentName?: string;
  fileExtension?: string;
  anchorString?: string;
  anchorXOffset?: number;
  anchorYOffset?: number;
}): Promise<DocuSignEnvelopeResponse | null> {

  const { data, error } = await supabase.functions.invoke('docusign-send-envelope', {
    body: {
      templateId: (input.templateId ?? DOCUSIGN_TEMPLATE_ID ?? '').trim() || undefined,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      roleName: input.roleName,
      emailSubject:
        input.emailSubject ??
        `GRIP Service Agreement for ${input.recipientName || 'your agency'}`,
      useDocument: input.useDocument ?? DOCUSIGN_USE_DOCUMENT,
      documentPath: input.documentPath ?? DOCUSIGN_DOCUMENT_PATH,
      documentUrl: input.documentUrl,
      documentName: input.documentName,
      fileExtension: input.fileExtension,
      anchorString: input.anchorString,
      anchorXOffset: input.anchorXOffset,
      anchorYOffset: input.anchorYOffset,
    },
  });

  if (error) {
    console.error('Error sending DocuSign envelope', error);
    return null;
  }

  return (data as DocuSignEnvelopeResponse | null) ?? null;
}

export interface SignupOrderRow {
  id: string;
  agency_id: string;
  prospect_id: string | null;
  client_id: string | null;
  agency_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  plan: string;
  branches: number | null;
  users: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export async function createSignupOrder(
  agencyId: string,
  input: {
    prospect_id?: string | null;
    client_id?: string | null;
    agency_name: string;
    contact_name: string;
    email: string;
    phone?: string;
    address?: string;
    plan: string;
    branches?: number;
    users?: number;
    notes?: string;
    status?: string;
  }
): Promise<SignupOrderRow | null> {
  const { data, error } = await supabase
    .from('signup_orders')
    .insert({
      agency_id: agencyId,
      prospect_id: input.prospect_id ?? null,
      client_id: input.client_id ?? null,
      agency_name: input.agency_name,
      contact_name: input.contact_name,
      email: input.email,
      phone: input.phone ?? null,
      address: input.address ?? null,
      plan: input.plan,
      branches: input.branches ?? null,
      users: input.users ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'sent',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating signup order', error);
    return null;
  }

  return data as SignupOrderRow;
}

export async function fetchSignupOrders(agencyId: string): Promise<SignupOrderRow[]> {
  const { data, error } = await supabase
    .from('signup_orders')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching signup orders', error);
    return [];
  }

  return (data as SignupOrderRow[]) ?? [];
}

export async function updateSignupOrder(
  id: string,
  input: Partial<Pick<SignupOrderRow, 'status' | 'notes' | 'plan' | 'branches' | 'users'>>
): Promise<SignupOrderRow | null> {
  const { data, error } = await supabase
    .from('signup_orders')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating signup order', error);
    return null;
  }

  return data as SignupOrderRow;
}

export async function deleteSignupOrder(id: string): Promise<void> {
  const { error } = await supabase.from('signup_orders').delete().eq('id', id);
  if (error) {
    console.error('Error deleting signup order', error);
  }
}

// =============================
// Owner dashboard: password vault
// =============================

export interface PasswordVaultItemRow {
  id: string;
  owner_user_id: string;
  title: string;
  username: string | null;
  secret: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchPasswordVaultItems(ownerUserId: string): Promise<PasswordVaultItemRow[]> {
  const { data, error } = await supabase
    .from('password_vault_items')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching password vault items', error);
    return [];
  }

  return (data as PasswordVaultItemRow[]) ?? [];
}

export async function createPasswordVaultItem(
  ownerUserId: string,
  input: { title: string; username?: string; secret: string; category?: string }
): Promise<PasswordVaultItemRow | null> {
  const { data, error } = await supabase
    .from('password_vault_items')
    .insert({
      owner_user_id: ownerUserId,
      title: input.title,
      username: input.username ?? null,
      secret: input.secret,
      category: input.category ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating password vault item', error);
    return null;
  }

  return data as PasswordVaultItemRow;
}

export async function deletePasswordVaultItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('password_vault_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting password vault item', error);
  }
}

// =============================
// Owner dashboard: compliance tasks
// =============================

export interface ComplianceTaskRow {
  id: string;
  agency_id: string;
  type: string;
  description: string;
  reminder_date: string;
  event_date: string;
  assigned_to: string;
  is_completed: boolean;
  created_at: string;
}

export async function fetchComplianceTasks(agencyId: string): Promise<ComplianceTaskRow[]> {
  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('*')
    .eq('agency_id', agencyId)
    .order('reminder_date', { ascending: true });

  if (error) {
    console.error('Error fetching compliance tasks', error);
    return [];
  }

  return (data as ComplianceTaskRow[]) ?? [];
}

export async function createComplianceTask(
  agencyId: string,
  input: { type: string; description: string; reminder_date: string; event_date: string; assigned_to: string }
): Promise<ComplianceTaskRow | null> {
  const { data, error } = await supabase
    .from('compliance_tasks')
    .insert({
      agency_id: agencyId,
      type: input.type,
      description: input.description,
      reminder_date: input.reminder_date,
      event_date: input.event_date,
      assigned_to: input.assigned_to,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating compliance task', error);
    return null;
  }

  return data as ComplianceTaskRow;
}

export async function updateComplianceTask(
  id: string,
  input: Partial<Pick<ComplianceTaskRow, 'type' | 'description' | 'reminder_date' | 'event_date' | 'assigned_to' | 'is_completed'>>
): Promise<ComplianceTaskRow | null> {
  const { data, error } = await supabase
    .from('compliance_tasks')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating compliance task', error);
    return null;
  }

  return data as ComplianceTaskRow;
}

export async function deleteComplianceTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('compliance_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting compliance task', error);
  }
}

// =============================
// Business Manager: Profit & Loss statements
// =============================

export interface PnLStatementRow {
  id: string;
  agency_id: string;
  scope: string;
  year: number;
  data: any;
  created_at: string;
  updated_at: string;
}

export async function fetchPnlStatement(
  agencyId: string,
  scope: string,
  year: number
): Promise<PnLStatementRow | null> {
  const { data, error } = await supabase
    .from('pnl_statements')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('scope', scope)
    .eq('year', year)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching pnl statement', {
      code: (error as any)?.code,
      status: (error as any)?.status,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    });
    return null;
  }

  return (data as PnLStatementRow) ?? null;
}

export async function upsertPnlStatement(
  agencyId: string,
  scope: string,
  year: number,
  dataJson: unknown
): Promise<PnLStatementRow | null> {
  const payload = {
    agency_id: agencyId,
    scope,
    year,
    data: dataJson,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('pnl_statements')
    .upsert(payload, { onConflict: 'agency_id,scope,year' })
    .select('*')
    .single();

  if (error) {
    const code = (error as any)?.code;
    const status = (error as any)?.status;
    const message = (error as any)?.message || '';

    if (code === 'PGRST116' || status === 403 || code === '42501' || /permission/i.test(message)) {
      console.warn('User does not have permission to upsert P&L statement data', { code, status, message });
      return null;
    }

    console.error('Error upserting pnl statement', { code, status, message, details: (error as any)?.details });
    return null;
  }

  return data as PnLStatementRow;
}

export async function ensureDefaultPnlStatement(
  agencyId: string,
  scope: string,
  year: number,
  defaultData: unknown
): Promise<PnLStatementRow | null> {
  try {
    const existing = await fetchPnlStatement(agencyId, scope, year);
    if (existing) return existing;
    return await upsertPnlStatement(agencyId, scope, year, defaultData);
  } catch (error) {
    console.warn('Could not ensure default P&L statement:', error);
    return null;
  }
}

// =============================
// Business Manager: B2B partner companies
// =============================

export interface B2BCompanyRow {
  id: string;
  agency_id: string;
  // Branch-scoping (client_branches.id). Null means “unscoped / legacy”.
  branch_id: string | null;
  name: string;
  type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  commission_type: string;
  commission_value: number | null;
  notes: string | null;
  total_referrals: number | null;
  total_commission: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchB2BCompanies(agencyId: string, clientId?: string): Promise<B2BCompanyRow[]> {
  let query = supabase
    .from('b2b_companies')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  // For client users, scope to their client_id
  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching b2b companies', error);
    return [];
  }

  return (data as B2BCompanyRow[]) ?? [];
}

export async function createB2BCompany(
  agencyId: string,
  input: {
    branch_id?: string;
    name: string;
    type: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    commission_type: 'fixed' | 'percentage';
    commission_value: number;
    notes?: string;
    status?: 'active' | 'inactive';
  },
  clientId?: string
): Promise<B2BCompanyRow | null> {
  const { data, error } = await supabase
    .from('b2b_companies')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      branch_id: input.branch_id ?? null,
      name: input.name,
      type: input.type,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone ?? null,
      commission_type: input.commission_type,
      commission_value: input.commission_value,
      notes: input.notes ?? null,
      status: input.status ?? 'active',
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating b2b company', error);
    return null;
  }

  return data as B2BCompanyRow;
}

export async function updateB2BCompany(
  id: string,
  input: Partial<
    Pick<
      B2BCompanyRow,
      | 'branch_id'
      | 'name'
      | 'type'
      | 'contact_name'
      | 'contact_email'
      | 'contact_phone'
      | 'commission_type'
      | 'commission_value'
      | 'notes'
      | 'total_referrals'
      | 'total_commission'
      | 'status'
    >
  >
): Promise<B2BCompanyRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.branch_id !== undefined) payload.branch_id = input.branch_id;
  if (input.name !== undefined) payload.name = input.name;
  if (input.type !== undefined) payload.type = input.type;
  if (input.contact_name !== undefined) payload.contact_name = input.contact_name;
  if (input.contact_email !== undefined) payload.contact_email = input.contact_email;
  if (input.contact_phone !== undefined) payload.contact_phone = input.contact_phone;
  if (input.commission_type !== undefined) payload.commission_type = input.commission_type;
  if (input.commission_value !== undefined) payload.commission_value = input.commission_value;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.total_referrals !== undefined) payload.total_referrals = input.total_referrals;
  if (input.total_commission !== undefined) payload.total_commission = input.total_commission;
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from('b2b_companies')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating b2b company', error);
    return null;
  }

  return data as B2BCompanyRow;
}

export async function deleteB2BCompany(id: string): Promise<void> {
  const { error } = await supabase.from('b2b_companies').delete().eq('id', id);
  if (error) {
    console.error('Error deleting b2b company', error);
  }
}

// =============================
// Business Manager: B2B individual referrals
// =============================

export interface B2BReferralRow {
  id: string;
  agency_id: string;
  // Branch-scoping (client_branches.id). Null means “unscoped / legacy”.
  branch_id: string | null;
  company_id: string;
  property_address: string;
  client_name: string;
  transaction_type: string | null;
  referral_date: string;
  status: string;
  commission_amount: number | null;
  notes: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchB2BReferrals(agencyId: string, clientId?: string): Promise<B2BReferralRow[]> {
  let query = supabase
    .from('b2b_referrals')
    .select('*')
    .eq('agency_id', agencyId)
    .order('referral_date', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching b2b referrals', error);
    return [];
  }

  return (data as B2BReferralRow[]) ?? [];
}

export async function fetchB2BReferralsForCompany(companyId: string): Promise<B2BReferralRow[]> {
  const { data, error } = await supabase
    .from('b2b_referrals')
    .select('*')
    .eq('company_id', companyId)
    .order('referral_date', { ascending: false });

  if (error) {
    console.error('Error fetching b2b referrals for company', error);
    return [];
  }

  return (data as B2BReferralRow[]) ?? [];
}

export async function createB2BReferral(
  agencyId: string,
  input: {
    branch_id?: string;
    company_id: string;
    property_address: string;
    client_name: string;
    transaction_type?: string;
    referral_date: string;
    status?: string;
    commission_amount?: number;
    notes?: string;
    link?: string;
  },
  clientId?: string
): Promise<B2BReferralRow | null> {
  const { data, error } = await supabase
    .from('b2b_referrals')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      branch_id: input.branch_id ?? null,
      company_id: input.company_id,
      property_address: input.property_address,
      client_name: input.client_name,
      transaction_type: input.transaction_type ?? null,
      referral_date: input.referral_date,
      status: input.status ?? 'pending',
      commission_amount: input.commission_amount ?? null,
      notes: input.notes ?? null,
      link: input.link ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating b2b referral', error);
    return null;
  }

  return data as B2BReferralRow;
}

export async function updateB2BReferral(
  id: string,
  input: Partial<Pick<B2BReferralRow, 'branch_id' | 'property_address' | 'client_name' | 'transaction_type' | 'referral_date' | 'status' | 'commission_amount' | 'notes' | 'link'>>
): Promise<B2BReferralRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.branch_id !== undefined) payload.branch_id = input.branch_id;
  if (input.property_address !== undefined) payload.property_address = input.property_address;
  if (input.client_name !== undefined) payload.client_name = input.client_name;
  if (input.transaction_type !== undefined) payload.transaction_type = input.transaction_type;
  if (input.referral_date !== undefined) payload.referral_date = input.referral_date;
  if (input.status !== undefined) payload.status = input.status;
  if (input.commission_amount !== undefined) payload.commission_amount = input.commission_amount;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.link !== undefined) payload.link = input.link;

  const { data, error } = await supabase
    .from('b2b_referrals')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating b2b referral', error);
    return null;
  }

  return data as B2BReferralRow;
}

export async function deleteB2BReferral(id: string): Promise<void> {
  const { error } = await supabase.from('b2b_referrals').delete().eq('id', id);
  if (error) {
    console.error('Error deleting b2b referral', error);
  }
}

// =============================
// Business Manager: Health & Safety items
// =============================

export interface HealthSafetyItemRow {
  id: string;
  agency_id: string;
  // Branch-scoping (client_branches.id). Null means “unscoped / legacy”.
  branch_id: string | null;
  title: string;
  category: string;
  status: string;
  due_date: string | null;
  last_updated: string;
  assigned_to: string;
  branch: string;
  details: any | null;
  created_at: string;
}

export async function fetchHealthSafetyItems(agencyId: string): Promise<HealthSafetyItemRow[]> {
  const { data, error } = await supabase
    .from('health_safety_items')
    .select('*')
    .eq('agency_id', agencyId)
    .order('last_updated', { ascending: false });

  if (error) {
    console.error('Error fetching health & safety items', error);
    return [];
  }

  return (data as HealthSafetyItemRow[]) ?? [];
}

export async function createHealthSafetyItem(
  agencyId: string,
  input: {
    branch_id?: string;
    title: string;
    category: string;
    status: string;
    due_date: string | null;
    last_updated: string;
    assigned_to: string;
    branch: string;
    details?: any;
  }
): Promise<HealthSafetyItemRow | null> {
  const { data, error } = await supabase
    .from('health_safety_items')
    .insert({
      agency_id: agencyId,
      branch_id: input.branch_id ?? null,
      title: input.title,
      category: input.category,
      status: input.status,
      due_date: input.due_date,
      last_updated: input.last_updated,
      assigned_to: input.assigned_to,
      branch: input.branch,
      details: input.details ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating health & safety item', error);
    return null;
  }

  return data as HealthSafetyItemRow;
}

export async function updateHealthSafetyItem(
  id: string,
  input: Partial<Pick<HealthSafetyItemRow, 'branch_id' | 'title' | 'category' | 'status' | 'due_date' | 'last_updated' | 'assigned_to' | 'branch' | 'details'>>
): Promise<HealthSafetyItemRow | null> {
  const { data, error } = await supabase
    .from('health_safety_items')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating health & safety item', error);
    return null;
  }

  return data as HealthSafetyItemRow;
}

export async function deleteHealthSafetyItem(id: string): Promise<void> {
  const { error } = await supabase.from('health_safety_items').delete().eq('id', id);
  if (error) {
    console.error('Error deleting health & safety item', error);
  }
}

// =============================
// Reports Management
// =============================

export interface ReportRow {
  id: string;
  client_id: string;
  name: string;
  type: 'sales' | 'financial' | 'performance' | 'custom';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  status: 'scheduled' | 'generating' | 'ready';
  last_generated: string;
  created_at: string;
  updated_at: string;
}

export async function createReport(
  clientId: string,
  input: Omit<ReportRow, 'id' | 'client_id' | 'created_at' | 'updated_at'>
): Promise<ReportRow | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ client_id: clientId, ...input }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating report:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Provide more helpful error messages
      if (error.code === '42P01') {
        throw new Error('Reports table does not exist. Please contact your administrator to update the database schema.');
      }
      if (error.code === '42501') {
        throw new Error('Permission denied. You do not have permission to create reports.');
      }
      if (error.message.includes('duplicate')) {
        throw new Error('A report with this name already exists.');
      }
      
      throw new Error(error.message || 'Failed to create report');
    }

    return data as ReportRow;
  } catch (error) {
    console.error('Unexpected error creating report:', error);
    throw error;
  }
}

export async function getReports(clientId: string): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    
    if (error.code === '42P01') {
      console.warn('Reports table does not exist yet');
      return [];
    }
    
    return [];
  }

  return data as ReportRow[];
}

export async function updateReport(
  id: string,
  input: Partial<Omit<ReportRow, 'id' | 'client_id' | 'created_at'>>
): Promise<ReportRow | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating report:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      
      if (error.code === '42P01') {
        throw new Error('Reports table does not exist.');
      }
      if (error.code === '42501') {
        throw new Error('Permission denied. You cannot update this report.');
      }
      
      throw new Error(error.message || 'Failed to update report');
    }

    return data as ReportRow;
  } catch (error) {
    console.error('Unexpected error updating report:', error);
    throw error;
  }
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) {
    console.error('Error deleting report:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    
    if (error.code === '42P01') {
      throw new Error('Reports table does not exist.');
    }
    if (error.code === '42501') {
      throw new Error('Permission denied. You cannot delete this report.');
    }
    
    throw new Error(error.message || 'Failed to delete report');
  }
}
