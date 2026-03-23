import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { resolveClientIdForUser } from '@/lib/dashboardApi';
import { DashboardModuleId } from '@/lib/dashboardModules';

export interface UserModuleConfig {
  enabledModules: DashboardModuleId[];
  source: 'client' | 'staff' | 'role' | 'default';
}

/**
 * Resolves the enabled modules for the current authenticated user.
 * Checks:
 * 1. If user is a staff member in client_staff table (uses staff enabled_modules)
 * 2. If user is a client in clients table (uses client enabled_modules)
 * 3. Returns empty array if no config found (will fall back to role defaults)
 */
export async function resolveUserEnabledModules(user: User | null): Promise<UserModuleConfig | null> {
  if (!user || !user.email) return null;

  // First, try to find if user is a staff member
  const { data: staffData, error: staffError } = await supabase
    .from('client_staff')
    .select('enabled_modules, client_id, role')
    .eq('email', user.email)
    .limit(1)
    .maybeSingle();

  // Prefer explicit per-user module config (client_staff.enabled_modules)
  if (!staffError && staffData && staffData.enabled_modules) {
    const modules = Array.isArray(staffData.enabled_modules)
      ? staffData.enabled_modules
      : [];
    return {
      enabledModules: modules as DashboardModuleId[],
      source: 'staff',
    };
  }

  // Fallback: role-level module config (client_staff_roles.enabled_modules)
  if (!staffError && staffData && staffData.client_id && staffData.role) {
    const { data: roleRows, error: roleError } = await supabase
      .from('client_staff_roles')
      .select('name, enabled_modules')
      .eq('client_id', staffData.client_id);

    if (!roleError && Array.isArray(roleRows)) {
      const target = String(staffData.role).trim().toLowerCase();
      const match = roleRows.find(
        (r: any) => String(r?.name ?? '').trim().toLowerCase() === target
      );

      if (match && match.enabled_modules) {
        const modules = Array.isArray(match.enabled_modules) ? match.enabled_modules : [];
        return {
          enabledModules: modules as DashboardModuleId[],
          source: 'role',
        };
      }
    }
  }

  // Next, try to find if user is a client
  const clientId = await resolveClientIdForUser(user);
  if (clientId) {
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('enabled_modules')
      .eq('id', clientId)
      .limit(1)
      .maybeSingle();

    if (!clientError && clientData && clientData.enabled_modules) {
      const modules = Array.isArray(clientData.enabled_modules)
        ? clientData.enabled_modules
        : [];
      return {
        enabledModules: modules as DashboardModuleId[],
        source: 'client',
      };
    }
  }

  // No user-specific config found
  return null;
}

/**
 * Resolves enabled modules for a staff member by their email
 */
export async function resolveStaffEnabledModules(email: string): Promise<DashboardModuleId[] | null> {
  const { data, error } = await supabase
    .from('client_staff')
    .select('enabled_modules')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.enabled_modules) {
    return null;
  }

  return Array.isArray(data.enabled_modules) ? data.enabled_modules as DashboardModuleId[] : null;
}

/**
 * Resolves enabled modules for a client by their ID
 */
export async function resolveClientEnabledModules(clientId: string): Promise<DashboardModuleId[] | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('enabled_modules')
    .eq('id', clientId)
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.enabled_modules) {
    return null;
  }

  return Array.isArray(data.enabled_modules) ? data.enabled_modules as DashboardModuleId[] : null;
}
