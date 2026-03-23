export const STAFF_ROLE_OPTIONS = [
  { value: 'Branch Owner', label: 'Branch Owner' },
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Negotiator', label: 'Negotiator' },
  { value: 'Assistant Manager', label: 'Assistant Manager' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Prospector', label: 'Prospector' },
] as const;

export type AppStaffRole = 'branch_manager' | 'negotiator' | 'prospector';

export const normalizeStaffRoleKey = (role: string | null | undefined) =>
  (role ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');

export const isManagerLikeRole = (role: string | null | undefined) => {
  const normalized = normalizeStaffRoleKey(role);
  return (
    normalized === 'branch manager' ||
    normalized === 'branch owner' ||
    normalized === 'admin' ||
    normalized === 'administrator' ||
    normalized === 'assistant manager' ||
    normalized === 'manager' ||
    normalized === 'branch_manager'
  );
};

export const isNegotiatorRole = (role: string | null | undefined) => {
  const normalized = normalizeStaffRoleKey(role);
  return normalized === 'negotiator' || normalized === 'negotiater';
};

export const isProspectingRole = (role: string | null | undefined) => {
  const normalized = normalizeStaffRoleKey(role);
  return normalized === 'prospector' || normalized === 'sales agent' || normalized === 'salesagent';
};

export const formatStaffRoleLabel = (role: string | null | undefined) => {
  const normalized = normalizeStaffRoleKey(role);

  if (normalized === 'branch manager' || normalized === 'manager' || normalized === 'branch_manager') {
    return 'Manager';
  }
  if (normalized === 'branch owner') return 'Branch Owner';
  if (normalized === 'admin') return 'Administrator';
  if (normalized === 'administrator') return 'Administrator';
  if (normalized === 'assistant manager') return 'Assistant Manager';
  if (normalized === 'negotiator' || normalized === 'negotiater') return 'Negotiator';
  if (normalized === 'prospector') return 'Prospector';
  if (normalized === 'sales agent' || normalized === 'salesagent') return 'Sales Agent';
  return role?.trim() || 'Prospector';
};

export const mapStaffRoleToAppRole = (role: string | null | undefined): AppStaffRole => {
  const normalized = normalizeStaffRoleKey(role);

  if (isManagerLikeRole(normalized)) return 'branch_manager';
  if (isNegotiatorRole(normalized)) return 'negotiator';
  if (isProspectingRole(normalized)) return 'prospector';
  if (normalized.includes('negotiator')) return 'negotiator';
  if (normalized.includes('prospector') || normalized.includes('sales agent') || normalized.includes('agent')) {
    return 'prospector';
  }
  if (normalized.includes('manager') || normalized.includes('owner') || normalized.includes('admin')) {
    return 'branch_manager';
  }
  return 'prospector';
};
