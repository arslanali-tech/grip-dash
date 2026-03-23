export type DashboardModuleId =
  | 'movements'
  | 'genius-calendar'
  | 'prospecting'
  | 'business-analytics'
  | 'my-analytics'
  | 'prospecting-analytics'
  | 'business-manager'
  | 'buyers-sellers'
  | 'tasks'
  | 'team-chat'
  | 'genius';

export const DASHBOARD_MODULES: { id: DashboardModuleId; label: string }[] = [
  { id: 'movements', label: 'Movements' },
  { id: 'genius-calendar', label: 'Diary' },
  { id: 'prospecting', label: 'Prospecting' },
  { id: 'business-analytics', label: 'Business Analytics' },
  { id: 'my-analytics', label: 'My Analytics (Negotiator)' },
  { id: 'prospecting-analytics', label: 'My Analytics (Prospector)' },
  { id: 'business-manager', label: 'Business Manager' },
  { id: 'buyers-sellers', label: 'Referrals' },
  { id: 'tasks', label: 'The Hub' },
  { id: 'team-chat', label: 'Team Chat' },
  { id: 'genius', label: 'Genius' },
];

export function buildToolbarConfig(enabled: readonly string[]) {
  const enabledSet = new Set(enabled);
  return DASHBOARD_MODULES.map((m) => ({
    id: m.id,
    label: m.label,
    enabled: enabledSet.has(m.id),
  }));
}

export function isModuleEnabledWithLegacyFallback(
  enabledModules: readonly string[],
  moduleId: DashboardModuleId
): boolean {
  const enabledSet = new Set(enabledModules);
  if (enabledSet.has(moduleId)) return true;

  // Backward-compatibility for records saved before dedicated My Analytics modules existed.
  const hasDedicatedAnalyticsModules =
    enabledSet.has('my-analytics') || enabledSet.has('prospecting-analytics');

  if (
    (moduleId === 'my-analytics' || moduleId === 'prospecting-analytics') &&
    !hasDedicatedAnalyticsModules
  ) {
    return enabledSet.has('business-analytics');
  }

  return false;
}
