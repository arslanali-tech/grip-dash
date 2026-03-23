import { create } from 'zustand';
import { DashboardModuleId, DASHBOARD_MODULES } from '@/lib/dashboardModules';

export type UserRole = 'owner' | 'branch_manager' | 'negotiator' | 'prospector' | 'admin' | 'client' | 'agency_user';

export interface RoleVisibilityConfig {
  role: UserRole;
  label: string;
  enabledModules: DashboardModuleId[];
  enabledSections: string[];
  canViewAnalytics: boolean;
  canManageStaff: boolean;
  canManageBranches: boolean;
  canAccessBusinessManager: boolean;
}

export interface ModuleConfig {
  id: DashboardModuleId;
  label: string;
  isEnabled: boolean;
  enabledForRoles: UserRole[];
  description?: string;
}

export interface SectionConfig {
  id: string;
  key: string;
  label: string;
  isEnabled: boolean;
  sortOrder: number;
  enabledForRoles: UserRole[];
}

interface BusinessConfigState {
  // Role visibility configurations
  roleConfigs: RoleVisibilityConfig[];
  
  // Module configurations
  moduleConfigs: ModuleConfig[];
  
  // Section configurations (for Business Manager)
  sectionConfigs: SectionConfig[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setRoleConfigs: (configs: RoleVisibilityConfig[]) => void;
  updateRoleConfig: (role: UserRole, updates: Partial<RoleVisibilityConfig>) => void;
  setModuleConfigs: (configs: ModuleConfig[]) => void;
  updateModuleConfig: (moduleId: DashboardModuleId, updates: Partial<ModuleConfig>) => void;
  setSectionConfigs: (configs: SectionConfig[]) => void;
  updateSectionConfig: (sectionId: string, updates: Partial<SectionConfig>) => void;
  toggleModuleForRole: (moduleId: DashboardModuleId, role: UserRole, enabled: boolean) => void;
  toggleSectionForRole: (sectionKey: string, role: UserRole, enabled: boolean) => void;
  getEnabledModulesForRole: (role: UserRole) => DashboardModuleId[];
  getEnabledSectionsForRole: (role: UserRole) => string[];
  isModuleEnabledForRole: (moduleId: DashboardModuleId, role: UserRole) => boolean;
  isSectionEnabledForRole: (sectionKey: string, role: UserRole) => boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Default role configurations
const defaultRoleConfigs: RoleVisibilityConfig[] = [
  {
    role: 'owner',
    label: 'Owner',
    enabledModules: DASHBOARD_MODULES.map(m => m.id),
    enabledSections: ['business-management', 'company-flow', 'branches', 'staff', 'b2b-referrals', 'health-safety', 'house-keeping'],
    canViewAnalytics: true,
    canManageStaff: true,
    canManageBranches: true,
    canAccessBusinessManager: true,
  },
  {
    role: 'branch_manager',
    label: 'Branch Manager',
    enabledModules: ['movements', 'genius-calendar', 'prospecting', 'business-analytics', 'business-manager', 'buyers-sellers', 'tasks', 'team-chat', 'genius'],
    enabledSections: ['business-management', 'company-flow', 'staff', 'b2b-referrals', 'health-safety', 'house-keeping'],
    canViewAnalytics: true,
    canManageStaff: true,
    canManageBranches: false,
    canAccessBusinessManager: true,
  },
  {
    role: 'negotiator',
    label: 'Negotiator',
    enabledModules: ['movements', 'genius-calendar', 'prospecting', 'business-analytics', 'my-analytics', 'buyers-sellers', 'tasks', 'team-chat', 'genius'],
    enabledSections: [],
    canViewAnalytics: true,
    canManageStaff: false,
    canManageBranches: false,
    canAccessBusinessManager: false,
  },
  {
    role: 'prospector',
    label: 'Prospector',
    enabledModules: ['prospecting', 'prospecting-analytics', 'team-chat'],
    enabledSections: [],
    canViewAnalytics: true,
    canManageStaff: false,
    canManageBranches: false,
    canAccessBusinessManager: false,
  },
  {
    role: 'admin',
    label: 'Admin',
    enabledModules: DASHBOARD_MODULES.map(m => m.id),
    enabledSections: ['business-management', 'company-flow', 'branches', 'staff', 'b2b-referrals', 'health-safety', 'house-keeping'],
    canViewAnalytics: true,
    canManageStaff: true,
    canManageBranches: true,
    canAccessBusinessManager: true,
  },
  {
    role: 'client',
    label: 'Client',
    enabledModules: DASHBOARD_MODULES.map(m => m.id),
    enabledSections: ['business-management', 'company-flow', 'branches', 'staff', 'b2b-referrals', 'health-safety', 'house-keeping'],
    canViewAnalytics: true,
    canManageStaff: true,
    canManageBranches: true,
    canAccessBusinessManager: true,
  },
  {
    role: 'agency_user',
    label: 'Agency User',
    enabledModules: DASHBOARD_MODULES.map(m => m.id),
    enabledSections: ['business-management', 'company-flow', 'branches', 'staff', 'b2b-referrals', 'health-safety', 'house-keeping'],
    canViewAnalytics: true,
    canManageStaff: true,
    canManageBranches: true,
    canAccessBusinessManager: true,
  },
];

// Default module configurations
const defaultModuleConfigs: ModuleConfig[] = DASHBOARD_MODULES.map(m => ({
  id: m.id,
  label: m.label,
  isEnabled: true,
  enabledForRoles: ['owner', 'branch_manager', 'negotiator', 'prospector', 'admin', 'client', 'agency_user'],
  description: `Access to ${m.label} functionality`,
}));

// Default section configurations
const defaultSectionConfigs: SectionConfig[] = [
  { id: '1', key: 'business-management', label: 'Business Management', isEnabled: true, sortOrder: 10, enabledForRoles: ['owner', 'branch_manager', 'admin'] },
  { id: '2', key: 'company-flow', label: 'Company Flow', isEnabled: true, sortOrder: 20, enabledForRoles: ['owner', 'branch_manager', 'admin'] },
  { id: '3', key: 'branches', label: 'Branches', isEnabled: true, sortOrder: 30, enabledForRoles: ['owner', 'admin'] },
  { id: '4', key: 'staff', label: 'Staff', isEnabled: true, sortOrder: 40, enabledForRoles: ['owner', 'branch_manager', 'admin'] },
  { id: '5', key: 'b2b-referrals', label: 'B2B Referrals', isEnabled: true, sortOrder: 50, enabledForRoles: ['owner', 'branch_manager', 'admin'] },
  { id: '6', key: 'health-safety', label: 'Health & Safety', isEnabled: true, sortOrder: 60, enabledForRoles: ['owner', 'branch_manager', 'admin'] },
  { id: '7', key: 'house-keeping', label: 'House Keeping', isEnabled: true, sortOrder: 70, enabledForRoles: ['owner', 'branch_manager', 'admin'] },
  { id: '8', key: 'role-configuration', label: 'Role Configuration', isEnabled: true, sortOrder: 80, enabledForRoles: ['owner', 'admin'] },
  { id: '9', key: 'module-configuration', label: 'Module Configuration', isEnabled: true, sortOrder: 90, enabledForRoles: ['owner', 'admin'] },
];

export const useBusinessConfigStore = create<BusinessConfigState>((set, get) => ({
  roleConfigs: defaultRoleConfigs,
  moduleConfigs: defaultModuleConfigs,
  sectionConfigs: defaultSectionConfigs,
  isLoading: false,
  error: null,

  setRoleConfigs: (configs) => set({ roleConfigs: configs }),

  updateRoleConfig: (role, updates) => {
    const { roleConfigs } = get();
    const updatedConfigs = roleConfigs.map(config =>
      config.role === role ? { ...config, ...updates } : config
    );
    set({ roleConfigs: updatedConfigs });
  },

  setModuleConfigs: (configs) => set({ moduleConfigs: configs }),

  updateModuleConfig: (moduleId, updates) => {
    const { moduleConfigs } = get();
    const updatedConfigs = moduleConfigs.map(config =>
      config.id === moduleId ? { ...config, ...updates } : config
    );
    set({ moduleConfigs: updatedConfigs });
  },

  setSectionConfigs: (configs) => set({ sectionConfigs: configs }),

  updateSectionConfig: (sectionId, updates) => {
    const { sectionConfigs } = get();
    const updatedConfigs = sectionConfigs.map(config =>
      config.id === sectionId ? { ...config, ...updates } : config
    );
    set({ sectionConfigs: updatedConfigs });
  },

  toggleModuleForRole: (moduleId, role, enabled) => {
    const { moduleConfigs } = get();
    const updatedConfigs = moduleConfigs.map(config => {
      if (config.id === moduleId) {
        const enabledForRoles = enabled
          ? [...new Set([...config.enabledForRoles, role])]
          : config.enabledForRoles.filter(r => r !== role);
        return { ...config, enabledForRoles };
      }
      return config;
    });
    set({ moduleConfigs: updatedConfigs });
  },

  toggleSectionForRole: (sectionKey, role, enabled) => {
    const { sectionConfigs } = get();
    const updatedConfigs = sectionConfigs.map(config => {
      if (config.key === sectionKey) {
        const enabledForRoles = enabled
          ? [...new Set([...config.enabledForRoles, role])]
          : config.enabledForRoles.filter(r => r !== role);
        return { ...config, enabledForRoles };
      }
      return config;
    });
    set({ sectionConfigs: updatedConfigs });
  },

  getEnabledModulesForRole: (role) => {
    const { moduleConfigs } = get();
    return moduleConfigs
      .filter(config => config.isEnabled && config.enabledForRoles.includes(role))
      .map(config => config.id);
  },

  getEnabledSectionsForRole: (role) => {
    const { sectionConfigs } = get();
    return sectionConfigs
      .filter(config => config.isEnabled && config.enabledForRoles.includes(role))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(config => config.key);
  },

  isModuleEnabledForRole: (moduleId, role) => {
    const { moduleConfigs } = get();
    const config = moduleConfigs.find(c => c.id === moduleId);
    return config ? config.isEnabled && config.enabledForRoles.includes(role) : false;
  },

  isSectionEnabledForRole: (sectionKey, role) => {
    const { sectionConfigs } = get();
    const config = sectionConfigs.find(c => c.key === sectionKey);
    return config ? config.isEnabled && config.enabledForRoles.includes(role) : false;
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
