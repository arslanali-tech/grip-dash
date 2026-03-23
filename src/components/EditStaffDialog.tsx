import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import {
  DEFAULT_PROSPECTOR_DASHBOARD_CONFIG,
  HOUSEKEEPING_ITEM_OPTIONS,
  PROSPECTOR_NAV_ITEM_OPTIONS,
  normalizeProspectorDashboardConfig,
  type HousekeepingItemId,
  type ProspectorDashboardConfig,
} from '@/lib/prospectorDashboardConfig';

export interface CommissionItem {
  id: string;
  label: string;
  type: 'percentage' | 'fixed';
  value: number;
}

const DEFAULT_SALES_COMMISSION: CommissionItem[] = [
  { id: 's1', label: 'Sale of Property', type: 'percentage', value: 0 },
  { id: 's2', label: 'Mortgage Sign Up', type: 'fixed', value: 0 },
];

const LEGACY_SALES_COMMISSION: CommissionItem[] = [
  { id: 's1', label: 'Sale of Property', type: 'percentage', value: 0 },
];

const DEFAULT_PROSPECTING_COMMISSION: CommissionItem[] = [
  { id: 'p1', label: 'Property On Books', type: 'percentage', value: 0 },
  { id: 'p2', label: 'Property Sold', type: 'percentage', value: 0 },
];

const LEGACY_PROSPECTING_COMMISSION: CommissionItem[] = [
  { id: 'p1', label: 'Property sold (exchange)', type: 'percentage', value: 0 },
  { id: 'p2', label: 'Property valuation', type: 'percentage', value: 0 },
];

const DEFAULT_LETTINGS_COMMISSION: CommissionItem[] = [
  { id: 'l1', label: 'On Books to Let', type: 'fixed', value: 0 },
  { id: 'l2', label: 'Let By', type: 'fixed', value: 0 },
];

const cloneCommissionItems = (items: CommissionItem[]) => items.map((item) => ({ ...item }));

const matchesCommissionTemplate = (items: CommissionItem[] | undefined, template: CommissionItem[]) =>
  Array.isArray(items) &&
  items.length === template.length &&
  items.every((item, index) =>
    item.label === template[index].label &&
    item.type === template[index].type &&
    item.value === template[index].value
  );

const isProspectingRole = (roleName: string) => {
  const normalized = roleName.trim().toLowerCase();
  return normalized === 'prospector' || normalized === 'sales agent' || normalized === 'salesagent';
};

const normalizeCommissionType = (value: unknown): CommissionItem['type'] =>
  value === 'fixed' || value === 'percentage' ? value : 'percentage';

const normalizeCommissionValue = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeProspectorSalesCommission = (items?: CommissionItem[]): CommissionItem[] => {
  if (!items || items.length === 0) {
    return cloneCommissionItems(DEFAULT_PROSPECTING_COMMISSION);
  }

  const remaining = items.map((item) => ({ ...item }));
  const normalizeLabel = (label: string) => label.trim().toLowerCase();
  const matchesOnBooks = (label: string) =>
    label.includes('on book') ||
    label.includes('on-books') ||
    label.includes('instruction') ||
    label.includes('valuation') ||
    label.includes('for sale') ||
    label.includes('sale');
  const matchesSold = (label: string) =>
    label.includes('sold') ||
    label.includes('exchange') ||
    label.includes('completed');

  const takeMatch = (predicate: (label: string) => boolean) => {
    const index = remaining.findIndex((item) => predicate(normalizeLabel(item.label ?? '')));
    if (index < 0) return undefined;
    const [item] = remaining.splice(index, 1);
    return item;
  };

  const onBooksCandidate = takeMatch(matchesOnBooks) ?? remaining.shift();
  const soldCandidate = takeMatch(matchesSold) ?? remaining.shift();

  const onBooksItem: CommissionItem = {
    id: onBooksCandidate?.id ?? 'p1',
    label: 'Property On Books',
    type: normalizeCommissionType(onBooksCandidate?.type),
    value: normalizeCommissionValue(onBooksCandidate?.value),
  };

  const soldItem: CommissionItem = {
    id: soldCandidate?.id ?? 'p2',
    label: 'Property Sold',
    type: normalizeCommissionType(soldCandidate?.type),
    value: normalizeCommissionValue(soldCandidate?.value),
  };

  const normalized = [onBooksItem, soldItem];

  if (remaining.length > 0) {
    normalized.push(
      ...remaining.map((item, index) => ({
        id: item.id ?? `p_extra_${index + 1}`,
        label: item.label ?? 'Additional',
        type: normalizeCommissionType(item.type),
        value: normalizeCommissionValue(item.value),
      }))
    );
  }

  return normalized;
};

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  branch: string;
  email: string;
  phone: string;
  enabledModules?: string[];
  prospectorDashboardConfig?: ProspectorDashboardConfig;
  avatar: string;
  activeListings: number;
  completedDeals: number;
  totalRevenue: number;
  status: 'active' | 'away' | 'offline';
  basicWage?: number;
  employerNICs?: number;
  employerPension?: number;
  holidayAllowance?: number;
  commissionBreakdown?: {
    sales: CommissionItem[];
    lettings: CommissionItem[];
  };
}

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSave: (updatedStaff: StaffMember) => void;
  branches?: { id: string; name: string }[];
  availableModules?: string[];
  canEditModules?: boolean;
  canEditProspectorDashboard?: boolean;
}

export function EditStaffDialog({
  open,
  onOpenChange,
  staff,
  onSave,
  branches,
  availableModules,
  canEditModules = false,
  canEditProspectorDashboard = false,
}: EditStaffDialogProps) {
  const [formData, setFormData] = useState<StaffMember | null>(null);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  const branchesList: { id: string; name: string }[] = branches ?? [];
  const allModuleIds = useMemo(() => DASHBOARD_MODULES.map((m) => m.id), []);
  const allowedModuleIds = useMemo(() => {
    const raw = Array.isArray(availableModules) && availableModules.length > 0 ? availableModules : allModuleIds;
    const set = new Set(raw);
    if (set.has('business-analytics')) {
      set.add('my-analytics');
      set.add('prospecting-analytics');
    }
    return allModuleIds.filter((id) => set.has(id));
  }, [availableModules, allModuleIds]);
  const allowedModuleIdSet = useMemo(() => new Set(allowedModuleIds), [allowedModuleIds]);

  useEffect(() => {
    if (staff) {
      const isProspecting = isProspectingRole(staff.role ?? '');
      const defaultSales = isProspecting ? DEFAULT_PROSPECTING_COMMISSION : DEFAULT_SALES_COMMISSION;
      const existingSales = staff.commissionBreakdown?.sales;
      const existingLettings = staff.commissionBreakdown?.lettings;

      const shouldUseProspectingDefaults =
        isProspecting &&
        (!existingSales ||
          matchesCommissionTemplate(existingSales, DEFAULT_SALES_COMMISSION) ||
          matchesCommissionTemplate(existingSales, LEGACY_SALES_COMMISSION) ||
          matchesCommissionTemplate(existingSales, LEGACY_PROSPECTING_COMMISSION));

      const resolvedSales = shouldUseProspectingDefaults
        ? cloneCommissionItems(DEFAULT_PROSPECTING_COMMISSION)
        : existingSales && existingSales.length > 0
          ? (isProspecting ? normalizeProspectorSalesCommission(existingSales) : existingSales)
          : cloneCommissionItems(defaultSales);

      const resolvedLettings = existingLettings && existingLettings.length > 0
        ? existingLettings
        : cloneCommissionItems(DEFAULT_LETTINGS_COMMISSION);

      const resolvedModules = Array.isArray(staff.enabledModules)
        ? staff.enabledModules.filter((id) => allowedModuleIdSet.has(id))
        : allowedModuleIds;
      const canManageProspectorConfig = canEditProspectorDashboard;
      const normalizedProspectorConfig = canManageProspectorConfig
        ? normalizeProspectorDashboardConfig(
            staff.prospectorDashboardConfig ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG
          )
        : undefined;

      setFormData({
        ...staff,
        enabledModules: resolvedModules.length > 0 ? resolvedModules : allowedModuleIds,
        prospectorDashboardConfig: normalizedProspectorConfig,
        commissionBreakdown: {
          sales: resolvedSales,
          lettings: resolvedLettings,
        },
      });
    }
  }, [staff, allowedModuleIds, allowedModuleIdSet]);

  const handleChange = (field: keyof StaffMember, value: string | number) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleCommissionChange = (
    category: 'sales' | 'lettings',
    id: string,
    field: keyof CommissionItem,
    value: string | number
  ) => {
    if (formData && formData.commissionBreakdown) {
      const updatedCategory = formData.commissionBreakdown[category].map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      setFormData({
        ...formData,
        commissionBreakdown: {
          ...formData.commissionBreakdown,
          [category]: updatedCategory
        }
      });
    }
  };

  const addCommissionItem = (category: 'sales' | 'lettings') => {
    if (formData && formData.commissionBreakdown) {
      const newItem: CommissionItem = {
        id: Math.random().toString(36).substr(2, 9),
        label: 'New Item',
        type: 'fixed',
        value: 0
      };
      setFormData({
        ...formData,
        commissionBreakdown: {
          ...formData.commissionBreakdown,
          [category]: [...formData.commissionBreakdown[category], newItem]
        }
      });
    }
  };

  const removeCommissionItem = (category: 'sales' | 'lettings', id: string) => {
    if (formData && formData.commissionBreakdown) {
      setFormData({
        ...formData,
        commissionBreakdown: {
          ...formData.commissionBreakdown,
          [category]: formData.commissionBreakdown[category].filter(item => item.id !== id)
        }
      });
    }
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  const updateProspectorConfig = (next: ProspectorDashboardConfig) => {
    setFormData((prev) => (prev ? { ...prev, prospectorDashboardConfig: next } : prev));
  };

  const toggleProspectorNavItem = (id: ProspectorDashboardConfig['navItems'][number]) => {
    if (!formData) return;
    const current = formData.prospectorDashboardConfig?.navItems ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG.navItems;
    const isEnabled = current.includes(id);
    if (isEnabled && current.length <= 1) return;
    const next = isEnabled ? current.filter((item) => item !== id) : [...current, id];
    updateProspectorConfig({
      ...(formData.prospectorDashboardConfig ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG),
      navItems: next,
    });
  };

  const moveProspectorNavItem = (id: ProspectorDashboardConfig['navItems'][number], direction: -1 | 1) => {
    if (!formData) return;
    const current = [...(formData.prospectorDashboardConfig?.navItems ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG.navItems)];
    const index = current.indexOf(id);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    updateProspectorConfig({
      ...(formData.prospectorDashboardConfig ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG),
      navItems: next,
    });
  };

  const toggleHousekeepingItem = (id: HousekeepingItemId) => {
    if (!formData) return;
    const current = formData.prospectorDashboardConfig?.housekeepingItems ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG.housekeepingItems;
    updateProspectorConfig({
      ...(formData.prospectorDashboardConfig ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG),
      housekeepingItems: {
        ...current,
        [id]: !current[id],
      },
    });
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Edit Staff Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch" className="text-foreground">
                Branch<span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.branch} 
                onValueChange={(value) => handleChange('branch', value)}
                disabled={branchesList.length === 0}
              >
                <SelectTrigger id="branch" className="bg-background text-foreground border-border">
                  <SelectValue placeholder={branchesList.length === 0 ? 'No branches available' : 'Select branch'} />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {branchesList.map((branch) => (
                    <SelectItem key={branch.id} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {canEditModules && (
            <div className="space-y-2">
              <Label className="text-foreground">Enabled modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_MODULES.filter((m) => allowedModuleIdSet.has(m.id)).map((m) => (
                  <div key={`edit-mod-${m.id}`} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.enabledModules?.includes(m.id)}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => {
                          if (!prev) return prev;
                          const current = Array.isArray(prev.enabledModules) ? prev.enabledModules : [];
                          const nextEnabled = checked
                            ? (current.includes(m.id) ? current : [...current, m.id])
                            : current.filter((id) => id !== m.id);
                          return { ...prev, enabledModules: nextEnabled };
                        });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Controls which modules appear in this staff member's toolbar.
              </p>
            </div>
          )}

          {canEditProspectorDashboard && (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                {isProspectingRole(formData.role ?? '') ? (
                  <>
                    <h3 className="font-semibold text-foreground">Prospector Dashboard</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose which tabs appear and configure Housekeeping visibility.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-foreground">Housekeeping Cards</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose which Housekeeping cards appear for this staff member.
                    </p>
                  </>
                )}
              </div>

              {isProspectingRole(formData.role ?? '') && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Tabs & Order</Label>
                  <div className="space-y-2">
                    {PROSPECTOR_NAV_ITEM_OPTIONS.map((item) => {
                      const enabled = formData.prospectorDashboardConfig?.navItems?.includes(item.id);
                      return (
                        <div key={`prospector-tab-${item.id}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={enabled}
                              onCheckedChange={() => toggleProspectorNavItem(item.id)}
                            />
                            <span className="text-sm text-foreground">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!enabled}
                              onClick={() => moveProspectorNavItem(item.id, -1)}
                              aria-label={`Move ${item.label} up`}
                            >
                              <ChevronUpIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!enabled}
                              onClick={() => moveProspectorNavItem(item.id, 1)}
                              aria-label={`Move ${item.label} down`}
                            >
                              <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Housekeeping Items</Label>
                <div className="grid grid-cols-2 gap-2">
                  {HOUSEKEEPING_ITEM_OPTIONS.map((item) => {
                    const isVisible = formData.prospectorDashboardConfig?.housekeepingItems?.[item.id] ?? true;
                    return (
                      <div key={`housekeeping-item-${item.id}`} className="flex items-center gap-2">
                        <Checkbox
                          checked={isVisible}
                          onCheckedChange={() => toggleHousekeepingItem(item.id)}
                        />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Emergency Info Toggle Button */}
          <div className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
              className="w-full h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-2 border-red-300 dark:border-red-800 hover:border-red-400 dark:hover:border-red-700 font-medium"
            >
              {showAdditionalInfo ? 'Hide' : 'Show'} Emergency & Medical Info
            </Button>
          </div>

          {/* Collapsible Emergency & Medical Info Section */}
          {showAdditionalInfo && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              {/* Emergency Contact Information */}
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Emergency Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency-name" className="text-foreground">Contact Name</Label>
                    <Input
                      id="emergency-name"
                      placeholder="Full name"
                      className="bg-background text-foreground h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency-relationship" className="text-foreground">Relationship</Label>
                    <Input
                      id="emergency-relationship"
                      placeholder="e.g., Spouse, Parent"
                      className="bg-background text-foreground h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency-phone" className="text-foreground">Phone Number</Label>
                    <Input
                      id="emergency-phone"
                      type="tel"
                      placeholder="07700 900123"
                      className="bg-background text-foreground h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency-email" className="text-foreground">Email Address</Label>
                    <Input
                      id="emergency-email"
                      type="email"
                      placeholder="emergency@email.com"
                      className="bg-background text-foreground h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Medical Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medical-conditions" className="text-foreground">Medical Conditions</Label>
                    <textarea
                      id="medical-conditions"
                      placeholder="Any medical conditions we should be aware of..."
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergies" className="text-foreground">Allergies</Label>
                    <textarea
                      id="allergies"
                      placeholder="Any known allergies..."
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medications" className="text-foreground">Current Medications</Label>
                    <textarea
                      id="medications"
                      placeholder="List any current medications..."
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medical-notes" className="text-foreground">Additional Medical Notes</Label>
                    <textarea
                      id="medical-notes"
                      placeholder="Any other relevant medical information..."
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wages & Costs */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-foreground">Wages & Costs</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basicWage">Basic Wage (£)</Label>
                <Input
                  id="basicWage"
                  type="number"
                  value={formData.basicWage || ''}
                  onChange={(e) => handleChange('basicWage', parseFloat(e.target.value) || 0)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerNICs">Employer NIC's (£)</Label>
                <Input
                  id="employerNICs"
                  type="number"
                  value={formData.employerNICs || ''}
                  onChange={(e) => handleChange('employerNICs', parseFloat(e.target.value) || 0)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerPension">Employer Pensions (£)</Label>
                <Input
                  id="employerPension"
                  type="number"
                  value={formData.employerPension || ''}
                  onChange={(e) => handleChange('employerPension', parseFloat(e.target.value) || 0)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holidayAllowance">Holiday Allowance (days/year)</Label>
                <Input
                  id="holidayAllowance"
                  type="number"
                  value={formData.holidayAllowance || ''}
                  onChange={(e) => handleChange('holidayAllowance', parseInt(e.target.value) || 0)}
                  className="bg-background text-foreground"
                  placeholder="28"
                />
              </div>
            </div>
          </div>

          {/* Commission Breakdown */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-foreground">Commission Structure</h3>
            
            {/* Sales Commission */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">Sales</Label>
                <Button variant="ghost" size="sm" onClick={() => addCommissionItem('sales')} className="h-6 text-xs">
                  <PlusIcon className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              {formData.commissionBreakdown?.sales.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input 
                    value={item.label} 
                    onChange={(e) => handleCommissionChange('sales', item.id, 'label', e.target.value)}
                    className="flex-1 h-8 text-sm"
                    placeholder="Label"
                  />
                  <Select 
                    value={item.type} 
                    onValueChange={(value) => handleCommissionChange('sales', item.id, 'type', value)}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage %</SelectItem>
                      <SelectItem value="fixed">Fixed £</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={item.value} 
                    onChange={(e) => handleCommissionChange('sales', item.id, 'value', parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-sm"
                    placeholder="Value"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeCommissionItem('sales', item.id)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Lettings Commission */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">Lettings</Label>
                <Button variant="ghost" size="sm" onClick={() => addCommissionItem('lettings')} className="h-6 text-xs">
                  <PlusIcon className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              {formData.commissionBreakdown?.lettings.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input 
                    value={item.label} 
                    onChange={(e) => handleCommissionChange('lettings', item.id, 'label', e.target.value)}
                    className="flex-1 h-8 text-sm"
                    placeholder="Label"
                  />
                  <Select 
                    value={item.type} 
                    onValueChange={(value) => handleCommissionChange('lettings', item.id, 'type', value)}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage %</SelectItem>
                      <SelectItem value="fixed">Fixed £</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={item.value} 
                    onChange={(e) => handleCommissionChange('lettings', item.id, 'value', parseFloat(e.target.value) || 0)}
                    className="w-24 h-8 text-sm"
                    placeholder="Value"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeCommissionItem('lettings', item.id)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
