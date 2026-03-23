import type { ProspectorViewType } from '@/stores/prospectorStore';
import { supabase } from '@/lib/supabaseClient';

export type HousekeepingItemId =
  | 'latest-appraisal'
  | 'holiday-request'
  | 'absence-booking'
  | 'assessment-records'
  | 'appraisal-records'
  | 'document-uploads'
  | 'mileage-logs'
  | 'stationery-request'
  | 'invoice-generator'
  | 'invoice-templates'
  | 'commission-trend';

export interface ProspectorDashboardConfig {
  navItems: ProspectorViewType[];
  housekeepingItems: Record<HousekeepingItemId, boolean>;
}

export const PROSPECTOR_NAV_ITEM_OPTIONS: Array<{ id: ProspectorViewType; label: string }> = [
  { id: 'prospecting', label: 'Prospecting' },
  { id: 'prospecting-analytics', label: 'My Analytics' },
  { id: 'house-keeping', label: 'Housekeeping' },
  { id: 'team-chat', label: 'Team Chat' },
];

export const HOUSEKEEPING_ITEM_OPTIONS: Array<{ id: HousekeepingItemId; label: string }> = [
  { id: 'latest-appraisal', label: 'Latest Appraisal' },
  { id: 'holiday-request', label: 'Holiday Request' },
  { id: 'absence-booking', label: 'Absence Booking' },
  { id: 'assessment-records', label: 'Assessment Records' },
  { id: 'appraisal-records', label: 'Appraisal Records' },
  { id: 'document-uploads', label: 'Document Uploads' },
  { id: 'mileage-logs', label: 'Mileage Logs' },
  { id: 'stationery-request', label: 'Stationery Request' },
  { id: 'invoice-generator', label: 'Invoice Generator' },
  { id: 'invoice-templates', label: 'Invoice Templates' },
  { id: 'commission-trend', label: 'Commission Trend' },
];

export const DEFAULT_HOUSEKEEPING_VISIBILITY: Record<HousekeepingItemId, boolean> = {
  'latest-appraisal': true,
  'holiday-request': true,
  'absence-booking': true,
  'assessment-records': true,
  'appraisal-records': true,
  'document-uploads': true,
  'mileage-logs': true,
  'stationery-request': true,
  'invoice-generator': true,
  'invoice-templates': true,
  'commission-trend': true,
};

export const DEFAULT_PROSPECTOR_DASHBOARD_CONFIG: ProspectorDashboardConfig = {
  navItems: ['prospecting', 'prospecting-analytics', 'house-keeping'],
  housekeepingItems: DEFAULT_HOUSEKEEPING_VISIBILITY,
};

const isProspectorNavItem = (value: unknown): value is ProspectorViewType =>
  PROSPECTOR_NAV_ITEM_OPTIONS.some((item) => item.id === value);

const normalizeNavItems = (value: unknown): ProspectorViewType[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: ProspectorViewType[] = [];
  for (const item of value) {
    if (!isProspectorNavItem(item)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
};

export const normalizeProspectorDashboardConfig = (raw: unknown): ProspectorDashboardConfig => {
  const rawConfig = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const navItems = normalizeNavItems(rawConfig.navItems);
  const housekeepingItems: Record<HousekeepingItemId, boolean> = {
    ...DEFAULT_HOUSEKEEPING_VISIBILITY,
  };

  if (rawConfig.housekeepingItems && typeof rawConfig.housekeepingItems === 'object') {
    for (const key of Object.keys(housekeepingItems) as HousekeepingItemId[]) {
      const candidate = (rawConfig.housekeepingItems as Record<string, unknown>)[key];
      if (typeof candidate === 'boolean') {
        housekeepingItems[key] = candidate;
      }
    }
  }

  return {
    navItems: navItems.length > 0 ? navItems : DEFAULT_PROSPECTOR_DASHBOARD_CONFIG.navItems,
    housekeepingItems,
  };
};

const isMissingProspectorConfigColumn = (error: any): boolean => {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return text.includes('prospector_dashboard_config') && text.includes('does not exist');
};

export async function fetchProspectorDashboardConfigByStaffId(
  staffId: string
): Promise<ProspectorDashboardConfig | null> {
  if (!staffId) return null;
  const { data, error } = await supabase
    .from('client_staff')
    .select('prospector_dashboard_config')
    .eq('id', staffId)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingProspectorConfigColumn(error)) return null;
    console.warn('Error fetching prospector dashboard config by staff id', error);
    return null;
  }

  if (!data) return null;
  return normalizeProspectorDashboardConfig((data as any).prospector_dashboard_config ?? null);
}

export async function fetchProspectorDashboardConfigByEmail(
  email: string
): Promise<ProspectorDashboardConfig | null> {
  const normalized = email.trim();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from('client_staff')
    .select('prospector_dashboard_config')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingProspectorConfigColumn(error)) return null;
    console.warn('Error fetching prospector dashboard config by email', error);
    return null;
  }

  if (!data) return null;
  return normalizeProspectorDashboardConfig((data as any).prospector_dashboard_config ?? null);
}
