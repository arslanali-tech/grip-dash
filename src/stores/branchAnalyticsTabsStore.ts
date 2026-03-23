import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

export interface BranchAnalyticsTab {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  icon: string;
  component_key: string;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  enabled_for_roles: string[];
  created_at: string;
  updated_at: string;
}

interface BranchAnalyticsTabsState {
  tabs: BranchAnalyticsTab[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTabs: (agencyId: string, userRole?: string) => Promise<void>;
  addTab: (tab: Omit<BranchAnalyticsTab, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTab: (tabId: string, updates: Partial<BranchAnalyticsTab>) => Promise<void>;
  deleteTab: (tabId: string) => Promise<void>;
  reorderTabs: (agencyId: string, tabIds: string[]) => Promise<void>;
  getEnabledTabsForRole: (role: string) => BranchAnalyticsTab[];
  reset: () => void;
}

// Default tabs configuration (fallback when database is empty or unavailable)
export const DEFAULT_BRANCH_ANALYTICS_TABS: Omit<BranchAnalyticsTab, 'id' | 'agency_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Branch Overview',
    slug: 'overview',
    icon: 'LayoutDashboardIcon',
    component_key: 'BranchOverviewView',
    sort_order: 1,
    is_system: true,
    is_active: true,
    enabled_for_roles: ['owner', 'branch_manager', 'negotiator', 'admin', 'client', 'agency_user'],
  },
  {
    name: 'Branch Intelligence',
    slug: 'intelligence',
    icon: 'BrainCircuitIcon',
    component_key: 'BranchIntelligenceView',
    sort_order: 2,
    is_system: true,
    is_active: true,
    enabled_for_roles: ['owner', 'branch_manager', 'negotiator', 'admin', 'client', 'agency_user'],
  },
  {
    name: 'Team Performance',
    slug: 'team-performance',
    icon: 'UsersIcon',
    component_key: 'BranchTeamPerformanceView',
    sort_order: 3,
    is_system: true,
    is_active: true,
    enabled_for_roles: ['owner', 'branch_manager', 'negotiator', 'admin', 'client', 'agency_user'],
  },
  {
    name: 'Data Analytics',
    slug: 'data-analytics',
    icon: 'BarChart2Icon',
    component_key: 'BranchDataAnalyticsView',
    sort_order: 4,
    is_system: true,
    is_active: true,
    enabled_for_roles: ['owner', 'branch_manager', 'negotiator', 'admin', 'client', 'agency_user'],
  },
  {
    name: 'Reporting',
    slug: 'reporting',
    icon: 'FileTextIcon',
    component_key: 'BranchReportingView',
    sort_order: 5,
    is_system: true,
    is_active: true,
    enabled_for_roles: ['owner', 'branch_manager', 'negotiator', 'admin', 'client', 'agency_user'],
  },
];

export const useBranchAnalyticsTabsStore = create<BranchAnalyticsTabsState>((set, get) => ({
  tabs: [],
  isLoading: false,
  error: null,

  fetchTabs: async (agencyId: string, userRole?: string) => {
    if (!agencyId) {
      // No agency: show default tabs so Branch Analytics is still usable
      const defaultTabs = DEFAULT_BRANCH_ANALYTICS_TABS.map((tab, index) => ({
        ...tab,
        id: `default-${index}`,
        agency_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })).filter(tab => !userRole || tab.enabled_for_roles.includes(userRole));
      if (defaultTabs.length === 0) {
        set({ tabs: DEFAULT_BRANCH_ANALYTICS_TABS.map((tab, index) => ({
          ...tab,
          id: `default-${index}`,
          agency_id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })), isLoading: false, error: null });
      } else {
        set({ tabs: defaultTabs, isLoading: false, error: null });
      }
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('branch_analytics_tabs')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching branch analytics tabs:', error);
        // Fall back to defaults on error
        const defaultTabs = DEFAULT_BRANCH_ANALYTICS_TABS.map((tab, index) => ({
          ...tab,
          id: `default-${index}`,
          agency_id: agencyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        set({ tabs: defaultTabs, isLoading: false, error: error.message });
        return;
      }

      if (!data || data.length === 0) {
        // Seed tabs via RPC for this agency, then refetch
        const { error: rpcError } = await supabase.rpc('init_branch_analytics_tabs_for_agency', {
          p_agency_id: agencyId,
        });
        if (!rpcError) {
          const { data: refetched } = await supabase
            .from('branch_analytics_tabs')
            .select('*')
            .eq('agency_id', agencyId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          if (refetched && refetched.length > 0) {
            let filtered = (refetched as BranchAnalyticsTab[]).filter(tab => {
              const roles = tab.enabled_for_roles;
              if (!roles || !Array.isArray(roles)) return true;
              return !userRole || roles.includes(userRole);
            });
            if (filtered.length === 0) filtered = refetched as BranchAnalyticsTab[];
            set({ tabs: filtered, isLoading: false, error: null });
            return;
          }
        }
        // RPC failed or still empty: use defaults
        const defaultTabs = DEFAULT_BRANCH_ANALYTICS_TABS.map((tab, index) => ({
          ...tab,
          id: `default-${index}`,
          agency_id: agencyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        set({ tabs: defaultTabs, isLoading: false, error: null });
        return;
      }

      // Filter by user role if provided; ensure enabled_for_roles is array
      let filteredTabs = (data as BranchAnalyticsTab[]).filter(tab => {
        const roles = tab.enabled_for_roles;
        if (!roles || !Array.isArray(roles)) return true;
        return !userRole || roles.includes(userRole);
      });
      if (filteredTabs.length === 0) filteredTabs = data as BranchAnalyticsTab[];

      set({ tabs: filteredTabs, isLoading: false, error: null });
    } catch (err) {
      console.error('Exception fetching branch analytics tabs:', err);
      const defaultTabs = DEFAULT_BRANCH_ANALYTICS_TABS.map((tab, index) => ({
        ...tab,
        id: `default-${index}`,
        agency_id: agencyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      set({ 
        tabs: defaultTabs, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  },

  addTab: async (tab) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('branch_analytics_tabs')
        .insert([tab])
        .select()
        .single();

      if (error) {
        set({ isLoading: false, error: error.message });
        return;
      }

      const { tabs } = get();
      set({ 
        tabs: [...tabs, data as BranchAnalyticsTab].sort((a, b) => a.sort_order - b.sort_order),
        isLoading: false,
        error: null
      });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  },

  updateTab: async (tabId: string, updates: Partial<BranchAnalyticsTab>) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('branch_analytics_tabs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', tabId);

      if (error) {
        set({ isLoading: false, error: error.message });
        return;
      }

      const { tabs } = get();
      set({
        tabs: tabs.map(tab => 
          tab.id === tabId ? { ...tab, ...updates } : tab
        ).sort((a, b) => a.sort_order - b.sort_order),
        isLoading: false,
        error: null
      });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  },

  deleteTab: async (tabId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from('branch_analytics_tabs')
        .delete()
        .eq('id', tabId);

      if (error) {
        set({ isLoading: false, error: error.message });
        return;
      }

      const { tabs } = get();
      set({
        tabs: tabs.filter(tab => tab.id !== tabId),
        isLoading: false,
        error: null
      });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  },

  reorderTabs: async (agencyId: string, tabIds: string[]) => {
    set({ isLoading: true, error: null });

    try {
      // Update sort_order for each tab
      const updates = tabIds.map((id, index) => ({
        id,
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('branch_analytics_tabs')
          .update({ sort_order: update.sort_order, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) {
          console.error('Error reordering tab:', error);
        }
      }

      // Re-fetch to ensure consistency
      await get().fetchTabs(agencyId);
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  },

  getEnabledTabsForRole: (role: string) => {
    const { tabs } = get();
    return tabs.filter(tab => tab.is_active && tab.enabled_for_roles.includes(role));
  },

  reset: () => {
    set({ tabs: [], isLoading: false, error: null });
  },
}));
