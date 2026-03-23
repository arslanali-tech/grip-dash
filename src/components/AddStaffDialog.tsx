import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { UserPlusIcon, PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import {
  DEFAULT_PROSPECTOR_DASHBOARD_CONFIG,
  HOUSEKEEPING_ITEM_OPTIONS,
  PROSPECTOR_NAV_ITEM_OPTIONS,
  normalizeProspectorDashboardConfig,
  type HousekeepingItemId,
  type ProspectorDashboardConfig,
} from '@/lib/prospectorDashboardConfig';
import {
  STAFF_ROLE_OPTIONS,
  isManagerLikeRole,
  isProspectingRole,
  normalizeStaffRoleKey,
} from '@/lib/staffRoles';

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  branches?: { id: string; name: string }[];
  roleTemplates?: { name: string; enabledModules: string[] }[];
  availableModules?: string[];
  isBranchManager?: boolean;
  defaultBranch?: string;
  canEditProspectorDashboard?: boolean;
}

interface CommissionItem {
  id: string;
  label: string;
  type: 'percentage' | 'fixed';
  value: number;
}

const DEFAULT_SALES_COMMISSION: CommissionItem[] = [
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
];

const cloneCommissionItems = (items: CommissionItem[]) => items.map((item) => ({ ...item }));

const matchesCommissionTemplate = (items: CommissionItem[], template: CommissionItem[]) =>
  items.length === template.length &&
  items.every((item, index) =>
    item.label === template[index].label &&
    item.type === template[index].type &&
    item.value === template[index].value
  );

export function AddStaffDialog({
  open,
  onOpenChange,
  onSave,
  branches,
  roleTemplates,
  availableModules,
  isBranchManager = false,
  defaultBranch,
  canEditProspectorDashboard = false,
}: AddStaffDialogProps) {
  const allModuleIds = useMemo(() => DASHBOARD_MODULES.map((m) => m.id), []);

  const allowedModuleIds = useMemo(() => {
    const raw = Array.isArray(availableModules) && availableModules.length > 0 ? availableModules : allModuleIds;
    const set = new Set(raw);
    if (set.has('business-analytics')) {
      set.add('my-analytics');
      set.add('prospecting-analytics');
    }
    // Only keep modules that exist in DASHBOARD_MODULES
    return allModuleIds.filter((id) => set.has(id));
  }, [availableModules, allModuleIds]);

  const allowedModuleIdSet = useMemo(() => new Set(allowedModuleIds), [allowedModuleIds]);

  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    customRole: '',
    branch: defaultBranch ?? '',
    email: '',
    phone: '',
    enabledModules: allowedModuleIds,
    basicWage: '',
    employerNICs: '',
    employerPension: '',
    holidayAllowance: '',
    prospectorDashboardConfig: DEFAULT_PROSPECTOR_DASHBOARD_CONFIG as ProspectorDashboardConfig,
  });

  // Ensure we never keep modules that the client doesn't have enabled.
  // If the current selection is still the old "all modules" default, replace it with the allowed set.
  useEffect(() => {
    setFormData((prev) => {
      const current = Array.isArray(prev.enabledModules) ? prev.enabledModules : [];
      const filtered = current.filter((id) => allowedModuleIdSet.has(id));

      const isAllModulesDefault =
        current.length === allModuleIds.length &&
        allModuleIds.every((id) => current.includes(id));

      return {
        ...prev,
        enabledModules: isAllModulesDefault || current.length === 0 ? allowedModuleIds : filtered,
      };
    });
  }, [allowedModuleIds, allowedModuleIdSet, allModuleIds]);

  const [salesCommission, setSalesCommission] = useState<CommissionItem[]>(
    cloneCommissionItems(DEFAULT_SALES_COMMISSION)
  );

  const branchesList: { id: string; name: string }[] = branches ?? [];

  const extraRoleOptions = useMemo(() => {
    const normalized = new Set<string>();
    const options: string[] = [];
    const builtInRoleKeys = new Set([
      ...STAFF_ROLE_OPTIONS.map((option) => normalizeStaffRoleKey(option.value)),
      normalizeStaffRoleKey('Branch Manager'),
      normalizeStaffRoleKey('Admin'),
    ]);

    for (const t of roleTemplates ?? []) {
      const name = t.name?.trim();
      if (!name) continue;

      const key = normalizeStaffRoleKey(name);
      // Avoid duplicate/overlapping entries for built-in roles.
      if (builtInRoleKeys.has(key)) {
        continue;
      }

      if (normalized.has(key)) continue;
      normalized.add(key);
      options.push(name);
    }

    return options.sort((a, b) => a.localeCompare(b));
  }, [roleTemplates]);

  const [lettingsCommission, setLettingsCommission] = useState<CommissionItem[]>(
    cloneCommissionItems(DEFAULT_LETTINGS_COMMISSION)
  );

  const resolvedRoleName = useMemo(() => {
    if (formData.role === '__custom__') return formData.customRole.trim();
    return formData.role.trim();
  }, [formData.role, formData.customRole]);

  const isProspecting = useMemo(() => isProspectingRole(resolvedRoleName), [resolvedRoleName]);
  const canManageProspectorConfig = canEditProspectorDashboard && isProspecting;

  const updateProspectorConfig = (next: ProspectorDashboardConfig) => {
    setFormData((prev) => ({ ...prev, prospectorDashboardConfig: next }));
  };

  const toggleProspectorNavItem = (id: ProspectorDashboardConfig['navItems'][number]) => {
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
    const current = formData.prospectorDashboardConfig?.housekeepingItems ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG.housekeepingItems;
    updateProspectorConfig({
      ...(formData.prospectorDashboardConfig ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG),
      housekeepingItems: {
        ...current,
        [id]: !current[id],
      },
    });
  };

  useEffect(() => {
    if (!resolvedRoleName) return;

    setSalesCommission((current) => {
      if (isProspecting) {
        return matchesCommissionTemplate(current, DEFAULT_SALES_COMMISSION) ||
          matchesCommissionTemplate(current, LEGACY_PROSPECTING_COMMISSION)
          ? cloneCommissionItems(DEFAULT_PROSPECTING_COMMISSION)
          : current;
      }

      return matchesCommissionTemplate(current, DEFAULT_PROSPECTING_COMMISSION) ||
        matchesCommissionTemplate(current, LEGACY_PROSPECTING_COMMISSION)
        ? cloneCommissionItems(DEFAULT_SALES_COMMISSION)
        : current;
    });
  }, [resolvedRoleName, isProspecting]);

  const handleSave = () => {
    const roleName = resolvedRoleName;

    if (!formData.name || !roleName || !formData.branch || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    if (isBranchManager && isManagerLikeRole(roleName)) {
      alert('Branch managers cannot create manager accounts. Please choose another role.');
      return;
    }

    const newStaff = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      role: roleName,
      branch: formData.branch,
      email: formData.email,
      phone: formData.phone,
      enabledModules: formData.enabledModules,
      avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
      activeListings: 0,
      completedDeals: 0,
      totalRevenue: 0,
      status: 'active' as const,
      basicWage: parseFloat(formData.basicWage) || 0,
      employerNICs: parseFloat(formData.employerNICs) || 0,
      employerPension: parseFloat(formData.employerPension) || 0,
      holidayAllowance: parseInt(formData.holidayAllowance) || 28,
      commissionBreakdown: {
        sales: salesCommission,
        lettings: lettingsCommission,
      },
      prospectorDashboardConfig: canEditProspectorDashboard
        ? normalizeProspectorDashboardConfig(
            formData.prospectorDashboardConfig ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG
          )
        : undefined,
    };

    onSave(newStaff);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      role: '',
      customRole: '',
      branch: defaultBranch ?? '',
      email: '',
      phone: '',
      enabledModules: allowedModuleIds,
      basicWage: '',
      employerNICs: '',
      employerPension: '',
      holidayAllowance: '',
      prospectorDashboardConfig: DEFAULT_PROSPECTOR_DASHBOARD_CONFIG,
    });
    setSalesCommission(cloneCommissionItems(DEFAULT_SALES_COMMISSION));
    setLettingsCommission(cloneCommissionItems(DEFAULT_LETTINGS_COMMISSION));
    setShowAdditionalInfo(false);
  };

  const addCommissionItem = (category: 'sales' | 'lettings') => {
    const newItem: CommissionItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Item',
      type: 'fixed',
      value: 0
    };
    
    if (category === 'sales') {
      setSalesCommission([...salesCommission, newItem]);
    } else {
      setLettingsCommission([...lettingsCommission, newItem]);
    }
  };

  const removeCommissionItem = (category: 'sales' | 'lettings', id: string) => {
    if (category === 'sales') {
      setSalesCommission(salesCommission.filter(item => item.id !== id));
    } else {
      setLettingsCommission(lettingsCommission.filter(item => item.id !== id));
    }
  };

  const updateCommissionItem = (
    category: 'sales' | 'lettings',
    id: string,
    field: keyof CommissionItem,
    value: string | number
  ) => {
    const updateList = category === 'sales' ? salesCommission : lettingsCommission;
    const setList = category === 'sales' ? setSalesCommission : setLettingsCommission;
    
    setList(updateList.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Add New Staff Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Full Name<span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">
                Role<span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  setFormData((prev) => {
                    const template = (roleTemplates ?? []).find(
                      (t) => t.name?.trim().toLowerCase() === value.trim().toLowerCase()
                    );
                    const templateModules = Array.isArray(template?.enabledModules) ? template!.enabledModules : allowedModuleIds;
                    const nextTemplateModules = templateModules.filter((id) => allowedModuleIdSet.has(id));

                    return {
                      ...prev,
                      role: value,
                      enabledModules:
                        value === '__custom__'
                          ? prev.enabledModules.filter((id) => allowedModuleIdSet.has(id))
                          : (nextTemplateModules.length > 0 ? nextTemplateModules : allowedModuleIds),
                    };
                  });
                }}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {STAFF_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}

                  {extraRoleOptions.map((roleName) => (
                    <SelectItem key={`role-${roleName}`} value={roleName}>
                      {roleName}
                    </SelectItem>
                  ))}

                  <SelectItem value="__custom__">Custom role…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === '__custom__' && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="custom-role" className="text-foreground">
                  Custom role name<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="custom-role"
                  placeholder="e.g. Senior Negotiator"
                  value={formData.customRole}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customRole: e.target.value }))}
                  className="bg-background text-foreground"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email<span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john.smith@grip.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07700 900123"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="branch" className="text-foreground">
                Branch<span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.branch}
                onValueChange={(value) => setFormData({ ...formData, branch: value })}
                disabled={branchesList.length === 0 || isBranchManager}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
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
              {isBranchManager && formData.branch && (
                <p className="text-xs text-muted-foreground">Staff will be assigned to your branch: {formData.branch}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-foreground">Enabled modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_MODULES.filter((m) => allowedModuleIdSet.has(m.id)).map((m) => (
                  <div key={`staff-mod-${m.id}`} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.enabledModules.includes(m.id)}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => {
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
              <p className="text-xs text-muted-foreground">Controls which modules appear in this staff member's toolbar.</p>
            </div>
          </div>

          {canEditProspectorDashboard && (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                {isProspecting ? (
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

              {isProspecting && (
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
                <Label htmlFor="basicWage" className="text-foreground">Basic Wage (£)</Label>
                <Input
                  id="basicWage"
                  type="number"
                  placeholder="3000"
                  value={formData.basicWage}
                  onChange={(e) => setFormData({ ...formData, basicWage: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employerNICs" className="text-foreground">Employer NIC's (£)</Label>
                <Input
                  id="employerNICs"
                  type="number"
                  placeholder="350"
                  value={formData.employerNICs}
                  onChange={(e) => setFormData({ ...formData, employerNICs: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employerPension" className="text-foreground">Employer Pension (£)</Label>
                <Input
                  id="employerPension"
                  type="number"
                  placeholder="180"
                  value={formData.employerPension}
                  onChange={(e) => setFormData({ ...formData, employerPension: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holidayAllowance" className="text-foreground">Holiday Allowance (days/year)</Label>
                <Input
                  id="holidayAllowance"
                  type="number"
                  placeholder="28"
                  value={formData.holidayAllowance}
                  onChange={(e) => setFormData({ ...formData, holidayAllowance: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Commission Structure */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-foreground">Commission Structure</h3>
            
            {/* Sales Commission */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">Sales</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => addCommissionItem('sales')}
                  className="h-7 text-xs"
                >
                  <PlusIcon className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              {salesCommission.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input 
                    value={item.label} 
                    onChange={(e) => updateCommissionItem('sales', item.id, 'label', e.target.value)}
                    className="flex-1 h-9 text-sm"
                    placeholder="Label"
                  />
                  <Select 
                    value={item.type} 
                    onValueChange={(value) => updateCommissionItem('sales', item.id, 'type', value)}
                  >
                    <SelectTrigger className="w-[120px] h-9 text-sm">
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
                    onChange={(e) => updateCommissionItem('sales', item.id, 'value', parseFloat(e.target.value) || 0)}
                    className="w-24 h-9 text-sm"
                    placeholder="Value"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-destructive hover:bg-destructive/10" 
                    onClick={() => removeCommissionItem('sales', item.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Lettings Commission */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">Lettings</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => addCommissionItem('lettings')}
                  className="h-7 text-xs"
                >
                  <PlusIcon className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              {lettingsCommission.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input 
                    value={item.label} 
                    onChange={(e) => updateCommissionItem('lettings', item.id, 'label', e.target.value)}
                    className="flex-1 h-9 text-sm"
                    placeholder="Label"
                  />
                  <Select 
                    value={item.type} 
                    onValueChange={(value) => updateCommissionItem('lettings', item.id, 'type', value)}
                  >
                    <SelectTrigger className="w-[120px] h-9 text-sm">
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
                    onChange={(e) => updateCommissionItem('lettings', item.id, 'value', parseFloat(e.target.value) || 0)}
                    className="w-24 h-9 text-sm"
                    placeholder="Value"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-destructive hover:bg-destructive/10" 
                    onClick={() => removeCommissionItem('lettings', item.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlusIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Add Staff Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
