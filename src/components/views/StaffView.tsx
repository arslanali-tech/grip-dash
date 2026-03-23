import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UsersIcon,
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  LayoutGridIcon,
  ListIcon,
  TrendingUpIcon,
  HomeIcon,
  TrophyIcon,
  LayoutDashboardIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditStaffDialog } from '../EditStaffDialog';
import { AddStaffDialog } from '../AddStaffDialog';
import { StaffPerformanceDetailView } from '../StaffPerformanceDetailView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StaffLeagueTableView } from './StaffLeagueTableView';
import { StaffPerformanceSummaryView } from './StaffPerformanceSummaryView';
import {
  fetchBranches,
  fetchClientBranches,
  BranchRow,
  ClientBranchRow,
  fetchClientStaffForClient,
  fetchClientStaffRoles,
  upsertClientStaffRole,
  createClientStaff,
  updateClientStaff,
  deleteClientStaff,
  ClientStaffRow,
  fetchStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  StaffMemberRow,
  inviteUserByEmail,
} from '@/lib/ownerApi';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { resolveClientEnabledModules } from '@/lib/userModules';
import { useBranchManagerStore } from '@/stores/branchManagerStore';
import { useNegotiatorStore } from '@/stores/negotiatorStore';
import { useProspectorStore } from '@/stores/prospectorStore';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { resolveAgencyIdForUser, resolveClientIdForUser } from '@/lib/dashboardApi';
import { calculateMovementRevenue } from '@/lib/movementMetrics';
import { confirmDialog } from '@/hooks/use-confirm';
import { getUserRole } from '@/lib/ownerAccess';
import {
  DEFAULT_PROSPECTOR_DASHBOARD_CONFIG,
  normalizeProspectorDashboardConfig,
  type ProspectorDashboardConfig,
} from '@/lib/prospectorDashboardConfig';
import {
  formatStaffRoleLabel,
  mapStaffRoleToAppRole,
} from '@/lib/staffRoles';

interface StaffMember {
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
  commission?: number;
  employerNICs?: number;
  employerPension?: number;
  holidayAllowance?: number;
  commissionBreakdown?: {
    sales: { id: string; label: string; type: 'percentage' | 'fixed'; value: number }[];
    lettings: { id: string; label: string; type: 'percentage' | 'fixed'; value: number }[];
  };
}

interface MonthlyWin {
  month: string;
  revenue: number;
}

const staffMonthlyWins: Record<string, MonthlyWin[]> = {
  '1': [ // Sarah Johnson
    { month: 'Nov 2024', revenue: 125000 },
    { month: 'Aug 2024', revenue: 112000 },
  ],
  '7': [ // Rachel Green
    { month: 'Oct 2024', revenue: 118000 },
  ],
};

const CLOSED_STATUS_KEYS = new Set(['completed', 'exchanged', 'sale', 'let']);
const CURRENCY_SYMBOL = '\u00A3';
const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
const normalizeComparable = (value: string | null | undefined) => normalizeText(value).replace(/[^a-z0-9]/g, '');
const matchesStaffAgent = (agent: string | null | undefined, staffName: string, staffEmail?: string) => {
  const agentKey = normalizeComparable(agent);
  const staffKey = normalizeComparable(staffName);
  const emailKey = normalizeComparable(staffEmail ?? '');
  if (!agentKey || (!staffKey && !emailKey)) return false;
  if (staffKey && (agentKey === staffKey || agentKey.includes(staffKey) || staffKey.includes(agentKey))) return true;
  if (emailKey && (agentKey === emailKey || agentKey.includes(emailKey) || emailKey.includes(agentKey))) return true;
  return false;
};

const formatCurrencyCompact = (value: number) => {
  if (value >= 1_000_000) return `${CURRENCY_SYMBOL}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${CURRENCY_SYMBOL}${(value / 1_000).toFixed(0)}K`;
  return `${CURRENCY_SYMBOL}${value.toLocaleString()}`;
};

type CommissionItem = { label?: string; type?: 'percentage' | 'fixed'; value?: number };
type CommissionBreakdown = { sales?: CommissionItem[]; lettings?: CommissionItem[] };

const normalizeCommissionLabel = (label: string | undefined) => (label ?? '').trim().toLowerCase();
const findCommissionItem = (items: CommissionItem[] | undefined, keywords: string[]) => {
  if (!items || items.length === 0) return undefined;
  const found = items.find((item) =>
    keywords.some((keyword) => normalizeCommissionLabel(item.label).includes(keyword))
  );
  return found ?? items[0];
};

const getCommissionItemForClosed = (
  breakdown: CommissionBreakdown | undefined,
  movementType: string | null | undefined
) => {
  const normalizedType = normalizeText(movementType);
  if (normalizedType === 'letting') {
    return findCommissionItem(breakdown?.lettings, ['let by', 'let', 'completed']);
  }
  return findCommissionItem(breakdown?.sales, ['sold', 'sale', 'exchange', 'exchanged', 'completed']);
};

const calculateStaffCommissionForMovement = (
  movement: { type?: string | null } & { feeAmount?: number | null } & { feePercentage?: number | null } & { price?: number | null },
  staff: StaffMember
): number => {
  const item = getCommissionItemForClosed(staff.commissionBreakdown, movement.type);
  const baseFee = calculateMovementRevenue(movement);
  if (!item) return baseFee;
  const value = Number(item.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return baseFee;
  if (item.type === 'fixed') return value;
  const price = movement.price ?? 0;
  if (baseFee > 0) return (baseFee * value) / 100;
  if (price > 0) return (price * value) / 100;
  return baseFee;
};

const initialStaffMembers: StaffMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Branch Manager',
    branch: 'Central London',
    email: 'sarah.johnson@grip.com',
    phone: '020 7123 4567',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 12,
    completedDeals: 45,
    totalRevenue: 2500000,
    status: 'active',
    basicWage: 3500,
    commission: 500,
    employerNICs: 400,
    employerPension: 200
  },
  {
    id: '2',
    name: 'Michael Brown',
    role: 'Negotiator',
    branch: 'Manchester North',
    email: 'michael.brown@grip.com',
    phone: '0161 234 5678',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 8,
    completedDeals: 32,
    totalRevenue: 1800000,
    status: 'active',
    basicWage: 2800,
    commission: 400,
    employerNICs: 300,
    employerPension: 150
  },
  {
    id: '3',
    name: 'Emma Wilson',
    role: 'Property Consultant',
    branch: 'Birmingham Central',
    email: 'emma.wilson@grip.com',
    phone: '0121 345 6789',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 10,
    completedDeals: 38,
    totalRevenue: 2100000,
    status: 'away',
    basicWage: 3000,
    commission: 450,
    employerNICs: 350,
    employerPension: 180
  },
  {
    id: '4',
    name: 'David Lee',
    role: 'Sales Agent',
    branch: 'Leeds West',
    email: 'david.lee@grip.com',
    phone: '0113 456 7890',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 7,
    completedDeals: 28,
    totalRevenue: 1500000,
    status: 'active',
    basicWage: 2600,
    commission: 350,
    employerNICs: 280,
    employerPension: 140
  },
  {
    id: '5',
    name: 'Sophie Taylor',
    role: 'Lettings Specialist',
    branch: 'Bristol Harbourside',
    email: 'sophie.taylor@grip.com',
    phone: '0117 567 8901',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 9,
    completedDeals: 35,
    totalRevenue: 1900000,
    status: 'active',
    basicWage: 2900,
    commission: 420,
    employerNICs: 320,
    employerPension: 160
  },
  {
    id: '6',
    name: 'James Anderson',
    role: 'Property Consultant',
    branch: 'Liverpool South',
    email: 'james.anderson@grip.com',
    phone: '0151 678 9012',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 6,
    completedDeals: 25,
    totalRevenue: 1300000,
    status: 'offline',
    basicWage: 2700,
    commission: 380,
    employerNICs: 290,
    employerPension: 145
  },
  {
    id: '7',
    name: 'Rachel Green',
    role: 'Negotiator',
    branch: 'Central London',
    email: 'rachel.green@grip.com',
    phone: '020 7123 4568',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 11,
    completedDeals: 42,
    totalRevenue: 2300000,
    status: 'active',
    basicWage: 3200,
    commission: 480,
    employerNICs: 380,
    employerPension: 190
  },
  {
    id: '8',
    name: 'Tom Harris',
    role: 'Sales Agent',
    branch: 'Manchester North',
    email: 'tom.harris@grip.com',
    phone: '0161 234 5679',
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 5,
    completedDeals: 22,
    totalRevenue: 1200000,
    status: 'away',
    basicWage: 2500,
    commission: 300,
    employerNICs: 250,
    employerPension: 125
  }
];

type ViewMode = 'grid' | 'list';

const statusColors = {
  active: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted'
};

interface StaffViewProps {
  branchName?: string;
  agencyId?: string;
}

export function StaffView({ branchName, agencyId }: StaffViewProps) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const {
    clientId: clientIdFromStore,
    clientScopeIds,
    agencyId: agencyIdFromStore,
    movements: dashboardMovements,
    loadingMovements,
    loadMovements,
  } = useDashboardStore();

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<{ name: string; enabledModules: string[] }[]>([]);
  const [availableModuleIds, setAvailableModuleIds] = useState<string[]>(DASHBOARD_MODULES.map((m) => m.id));
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list view
  const [searchOpen, setSearchOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [staffToView, setStaffToView] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState('staff');
  const [resolvedAgencyId, setResolvedAgencyId] = useState<string | null>(agencyId ?? agencyIdFromStore ?? null);
  const lastMovementsKeyRef = useRef<string>('');

  const userRole = getUserRole(user);
  // Check if user has client_id in metadata (indicates they're a client, regardless of role name)
  const hasClientMetadata = !!(user?.user_metadata as any)?.client_id || !!(user?.app_metadata as any)?.client_id;
  const isClientUser = userRole === 'client' || userRole === 'agency_user' || hasClientMetadata;
  const isBranchManager = userRole === 'branch_manager';
  // Prefer the explicit client selection from the dashboard store (owner "Login as") when present.
  const effectiveClientId = (isClientUser || isBranchManager) ? (resolvedClientId ?? clientIdFromStore) : clientIdFromStore;
  const effectiveClientScope = (isClientUser || isBranchManager)
    ? (clientScopeIds && clientScopeIds.length > 0 ? clientScopeIds : effectiveClientId ? [effectiveClientId] : [])
    : (effectiveClientId ? [effectiveClientId] : []);
  const shouldUseClientMode = isClientUser || isBranchManager || !!effectiveClientId;
  const canCreateStaff = shouldUseClientMode ? !!effectiveClientId : !!resolvedAgencyId;
  const canEditModules = shouldUseClientMode;
  const canEditProspectorDashboard = shouldUseClientMode && (userRole === 'owner' || isBranchManager || isClientUser);

  // Debug logging for branch manager context
  console.log('[StaffView] Context:', {
    userRole,
    isBranchManager,
    isClientUser,
    resolvedClientId,
    clientIdFromStore,
    effectiveClientId,
    shouldUseClientMode,
    canCreateStaff,
    userMetadata: user?.user_metadata,
  });

  // Owner drill-in / impersonation (used by Owner -> select staff -> view their dashboard)
  const { setSelectedStaffMember: setSelectedBranchManager } = useBranchManagerStore();
  const { setSelectedStaffMember: setSelectedNegotiator } = useNegotiatorStore();
  const { setSelectedStaffMember: setSelectedProspector } = useProspectorStore();

  const withLegacyAnalyticsModules = (modules: string[]): string[] => {
    const allowed = new Set(modules);
    if (allowed.has('business-analytics')) {
      allowed.add('my-analytics');
      allowed.add('prospecting-analytics');
    }
    return DASHBOARD_MODULES.map((module) => module.id).filter((id) => allowed.has(id));
  };

  const mapRowToStaff = (row: StaffMemberRow): StaffMember => ({
    id: row.id,
    name: row.name,
    role: formatStaffRoleLabel(row.role),
    branch: row.branch_name ?? 'Unassigned',
    email: row.email,
    phone: row.phone ?? '',
    avatar: row.avatar_url ?? 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 0,
    completedDeals: 0,
    totalRevenue: 0,
    status: (row.status as StaffMember['status']) ?? 'active',
    basicWage: row.basic_wage ?? undefined,
    employerNICs: row.employer_nics ?? undefined,
    employerPension: row.employer_pension ?? undefined,
    holidayAllowance: row.holiday_allowance ?? undefined,
    commissionBreakdown: row.commission_breakdown ?? undefined,
  });

  const mapClientRowToStaff = (row: ClientStaffRow, branchNameById: Map<string, string>): StaffMember => ({
    id: row.id,
    name: row.name,
    role: formatStaffRoleLabel(row.role),
    branch: row.branch_id ? branchNameById.get(row.branch_id) ?? 'Unassigned' : 'Unassigned',
    email: row.email,
    phone: '',
    enabledModules: Array.isArray(row.enabled_modules) ? row.enabled_modules : undefined,
    prospectorDashboardConfig: row.prospector_dashboard_config ?? undefined,
    avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    activeListings: 0,
    completedDeals: 0,
    totalRevenue: 0,
    status: 'active',
    basicWage: row.basic_wage ?? undefined,
    employerNICs: row.employer_nics ?? undefined,
    employerPension: row.employer_pension ?? undefined,
    holidayAllowance: row.holiday_allowance ?? undefined,
    commissionBreakdown: row.commission_breakdown ?? undefined,
  });

  useEffect(() => {
    const loadStaffAndBranches = async () => {
      // Client mode (client dashboard or owner impersonating a client)
      if (shouldUseClientMode) {
        if (!effectiveClientId) {
          setBranchOptions([]);
          setRoleTemplates([]);
          setAvailableModuleIds(DASHBOARD_MODULES.map((m) => m.id));
          setStaffMembers([]);
          return;
        }

        const branchRows = await fetchClientBranches(effectiveClientScope.length > 0 ? effectiveClientScope : effectiveClientId);
        const mappedBranches = branchRows.map((b: ClientBranchRow) => ({ id: b.id, name: b.name }));
        setBranchOptions(mappedBranches);

        const branchNameById = new Map(mappedBranches.map((b) => [b.id, b.name] as const));

        const [staffRows, roleRows, clientModules] = await Promise.all([
          fetchClientStaffForClient(effectiveClientScope.length > 0 ? effectiveClientScope : effectiveClientId),
          fetchClientStaffRoles(effectiveClientId),
          resolveClientEnabledModules(effectiveClientId),
        ]);

        setStaffMembers(staffRows.map((r: ClientStaffRow) => mapClientRowToStaff(r, branchNameById)));

        const allModuleIds = DASHBOARD_MODULES.map((m) => m.id);
        const baseAllowedModules =
          Array.isArray(clientModules) && clientModules.length > 0 ? clientModules : allModuleIds;
        const allowedModules = withLegacyAnalyticsModules(baseAllowedModules);
        setAvailableModuleIds(allowedModules);

        const allowedSet = new Set(allowedModules);

        // Build role options for the Add Staff dialog:
        // 1) Prefer explicit role templates from client_staff_roles
        // 2) Fallback to roles observed in existing client_staff rows
        const mergedByKey = new Map<string, { name: string; enabledModules: string[] }>();

        for (const r of roleRows) {
          const name = r.name?.trim();
          if (!name) continue;
          const key = name.toLowerCase();
          const modules = Array.isArray(r.enabled_modules) ? r.enabled_modules.filter((id) => allowedSet.has(id)) : allowedModules;
          mergedByKey.set(key, {
            name,
            enabledModules: modules.length > 0 ? modules : allowedModules,
          });
        }

        for (const s of staffRows) {
          const name = s.role?.trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (mergedByKey.has(key)) continue;
          const modules = Array.isArray(s.enabled_modules) ? s.enabled_modules.filter((id) => allowedSet.has(id)) : allowedModules;
          mergedByKey.set(key, {
            name,
            enabledModules: modules.length > 0 ? modules : allowedModules,
          });
        }

        setRoleTemplates(Array.from(mergedByKey.values()).sort((a, b) => a.name.localeCompare(b.name)));

        return;
      }

      // Agency mode (owner/admin)
      if (!resolvedAgencyId) {
        setBranchOptions([]);
        setRoleTemplates([]);
        setAvailableModuleIds(DASHBOARD_MODULES.map((m) => m.id));
        setStaffMembers([]);
        return;
      }

      const branchRows = await fetchBranches(resolvedAgencyId);
      setBranchOptions(branchRows.map((b: BranchRow) => ({ id: b.id, name: b.name })));
      setAvailableModuleIds(DASHBOARD_MODULES.map((m) => m.id));

      const rows = await fetchStaffMembers(resolvedAgencyId);
      setStaffMembers(rows.map(mapRowToStaff));
    };

    void loadStaffAndBranches();
  }, [resolvedAgencyId, effectiveClientId, effectiveClientScope, shouldUseClientMode]);

  // Resolve clientId for client/agency users and branch managers
  useEffect(() => {
    if (!isClientUser && !isBranchManager) {
      setResolvedClientId(null);
      return;
    }
    if (!user) return;

    let cancelled = false;
    const run = async () => {
      // Branch managers have client_id in their metadata
      const metaClientId = (user.user_metadata as any)?.client_id;
      if (metaClientId && isBranchManager) {
        if (!cancelled) {
          setResolvedClientId(metaClientId);
        }
        return;
      }
      
      const resolved = await resolveClientIdForUser(user);
      if (!cancelled) {
        setResolvedClientId(resolved);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isClientUser, isBranchManager, user?.id, user?.email]);

  // Resolve agencyId for non-owner users when not provided
  useEffect(() => {
    if (agencyId) {
      setResolvedAgencyId(agencyId);
      return;
    }
    if (agencyIdFromStore) {
      setResolvedAgencyId(agencyIdFromStore);
      return;
    }
    if (!user) return;

    let cancelled = false;
    const run = async () => {
      const resolved = await resolveAgencyIdForUser(user);
      if (!cancelled) {
        setResolvedAgencyId(resolved);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [agencyId, agencyIdFromStore, user?.id]);

  // Force grid view on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile]);

  useEffect(() => {
    if (!resolvedAgencyId) return;
    if (loadingMovements) return;
    const key = `${resolvedAgencyId}:${effectiveClientId ?? 'none'}`;
    if (lastMovementsKeyRef.current === key) return;
    lastMovementsKeyRef.current = key;
    void loadMovements(resolvedAgencyId, effectiveClientScope.length > 0 ? effectiveClientScope : effectiveClientId ?? undefined);
  }, [resolvedAgencyId, effectiveClientId, effectiveClientScope, loadingMovements, loadMovements]);

  const staffMembersWithMetrics = useMemo(() => {
    if (dashboardMovements.length === 0) return staffMembers;
    return staffMembers.map((staff) => {
      const totalRevenue = dashboardMovements
        .filter((movement) =>
          matchesStaffAgent(movement.agent, staff.name, staff.email) &&
          CLOSED_STATUS_KEYS.has(normalizeText(movement.status))
        )
        .reduce((sum, movement) => sum + calculateStaffCommissionForMovement(movement, staff), 0);
      return {
        ...staff,
        totalRevenue,
      };
    });
  }, [dashboardMovements, staffMembers]);

  const handleStaffClick = (staff: StaffMember) => {
    setStaffToView(staff);
  };

  const handleEditClick = (staff: StaffMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setStaffToEdit(staff);
    setEditDialogOpen(true);
  };

  const handleSaveStaff = async (updatedStaff: StaffMember) => {
    // Client mode: update client staff
    if (shouldUseClientMode) {
      if (!effectiveClientId) {
        setStaffMembers(prev => prev.map(s => (s.id === updatedStaff.id ? updatedStaff : s)));
        return;
      }

      const allModuleIds = DASHBOARD_MODULES.map((m) => m.id);
      const allowedModules = Array.isArray(availableModuleIds) && availableModuleIds.length > 0
        ? availableModuleIds
        : allModuleIds;
      const allowedSet = new Set(allowedModules);
      const requestedModules = Array.isArray(updatedStaff.enabledModules)
        ? updatedStaff.enabledModules
        : allowedModules;
      const enabledModules = requestedModules.filter((id) => allowedSet.has(id));
      const finalEnabledModules = enabledModules.length > 0 ? enabledModules : allowedModules;
      const normalizedProspectorConfig =
        updatedStaff.prospectorDashboardConfig
          ? normalizeProspectorDashboardConfig(updatedStaff.prospectorDashboardConfig)
          : undefined;

      const branchId = branchOptions.find((b) => b.name === updatedStaff.branch)?.id ?? null;
      const staffPayload: Parameters<typeof updateClientStaff>[1] = {
        name: updatedStaff.name,
        email: updatedStaff.email,
        role: updatedStaff.role,
        branch_id: branchId,
        enabled_modules: finalEnabledModules,
        basic_wage: updatedStaff.basicWage ?? null,
        employer_nics: updatedStaff.employerNICs ?? null,
        employer_pension: updatedStaff.employerPension ?? null,
        holiday_allowance: updatedStaff.holidayAllowance ?? null,
        commission_breakdown: updatedStaff.commissionBreakdown ?? null,
      };
      if (normalizedProspectorConfig !== undefined) {
        staffPayload.prospector_dashboard_config = normalizedProspectorConfig;
      }

      const saved = await updateClientStaff(updatedStaff.id, staffPayload);

      if (!saved) {
        alert('Failed to update staff member in Supabase.');
        return;
      }

      // Best-effort: update reusable role template so future staff inherit changes.
      const roleLabel = (updatedStaff.role ?? '').trim();
      if (roleLabel) {
        void upsertClientStaffRole(effectiveClientId, {
          name: roleLabel,
          enabled_modules: finalEnabledModules,
        }).then((savedRole) => {
          if (!savedRole) return;
          const savedModulesRaw = Array.isArray(savedRole.enabled_modules)
            ? savedRole.enabled_modules
            : finalEnabledModules;
          const savedModules = savedModulesRaw.filter((id) => allowedSet.has(id));
          const normalizedSavedModules = savedModules.length > 0 ? savedModules : allowedModules;
          setRoleTemplates((prev) => {
            const idx = prev.findIndex((r) => r.name.trim().toLowerCase() === savedRole.name.trim().toLowerCase());
            const next = [...prev];
            if (idx >= 0) {
              next[idx] = { name: savedRole.name, enabledModules: normalizedSavedModules };
            } else {
              next.push({ name: savedRole.name, enabledModules: normalizedSavedModules });
            }
            return next.sort((a, b) => a.name.localeCompare(b.name));
          });
        });
      }

      const branchNameById = new Map(branchOptions.map((b) => [b.id, b.name] as const));
      const mapped = mapClientRowToStaff(saved, branchNameById);
      setStaffMembers(prev => prev.map(s => (s.id === mapped.id ? mapped : s)));
      setStaffToView(prev => (prev?.id === mapped.id ? mapped : prev));
      setStaffToEdit(prev => (prev?.id === mapped.id ? mapped : prev));
      return;
    }

    // Agency mode: update staff_members
    if (!resolvedAgencyId) {
      setStaffMembers(prev => prev.map(s => (s.id === updatedStaff.id ? updatedStaff : s)));
      return;
    }

    const saved = await updateStaffMember(updatedStaff.id, {
      name: updatedStaff.name,
      role: updatedStaff.role,
      branchName: updatedStaff.branch,
      email: updatedStaff.email,
      phone: updatedStaff.phone,
      avatarUrl: updatedStaff.avatar,
      basicWage: updatedStaff.basicWage,
      employerNICs: updatedStaff.employerNICs,
      employerPension: updatedStaff.employerPension,
      holidayAllowance: updatedStaff.holidayAllowance,
      commissionBreakdown: updatedStaff.commissionBreakdown,
    });

    if (!saved) {
      alert('Failed to update staff member in Supabase.');
      return;
    }

    const mapped = mapRowToStaff(saved);
    setStaffMembers(prev => prev.map(s => (s.id === mapped.id ? mapped : s)));
    setStaffToView(prev => (prev?.id === mapped.id ? mapped : prev));
    setStaffToEdit(prev => (prev?.id === mapped.id ? mapped : prev));
  };

  const clearDrillInSelection = () => {
    setSelectedBranchManager(null);
    setSelectedNegotiator(null);
    setSelectedProspector(null);
  };

  const handleDrillInToDashboard = (staff: StaffMember) => {
    if (!resolvedAgencyId) return; // only owners (agency context) can drill in

    const appRole = mapStaffRoleToAppRole(staff.role);
    const target = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      branch: staff.branch,
    };

    clearDrillInSelection();

    if (appRole === 'branch_manager') {
      setSelectedBranchManager(target);
      return;
    }

    if (appRole === 'negotiator') {
      setSelectedNegotiator(target);
      return;
    }

    setSelectedProspector(target);
  };

  const handleAddStaff = async (newStaff: StaffMember) => {
    if (!canCreateStaff) {
      alert('No client/agency context found. Please reload or log in again.');
      return;
    }

    // Client mode: persist to client_staff
    if (shouldUseClientMode) {
      if (!effectiveClientId) return;

      const allModuleIds = DASHBOARD_MODULES.map((m) => m.id);
      const allowedModules = Array.isArray(availableModuleIds) && availableModuleIds.length > 0 ? availableModuleIds : allModuleIds;
      const allowedSet = new Set(allowedModules);
      const requestedModules = Array.isArray(newStaff.enabledModules) ? newStaff.enabledModules : allowedModules;
      const enabledModules = requestedModules.filter((id) => allowedSet.has(id));
      const finalEnabledModules = enabledModules.length > 0 ? enabledModules : allowedModules;

      const roleLabel = (newStaff.role ?? '').trim();
      if (!roleLabel) {
        alert('Please select a role.');
        return;
      }

      const invitationRole = mapStaffRoleToAppRole(roleLabel);

      if (isBranchManager && invitationRole === 'branch_manager') {
        alert('Branch managers cannot create manager accounts. Please choose another role.');
        return;
      }

      // Prevent duplicate email entries
      const existingByEmail = staffMembers.find(
        (s) => s.email.trim().toLowerCase() === newStaff.email.trim().toLowerCase()
      );
      if (existingByEmail) {
        alert(`A staff member with email "${newStaff.email}" already exists (${existingByEmail.name}). Please use a different email.`);
        return;
      }

      const branchId = branchOptions.find((b) => b.name === newStaff.branch)?.id ?? null;
      const resolvedProspectorConfig =
        newStaff.prospectorDashboardConfig
          ? normalizeProspectorDashboardConfig(newStaff.prospectorDashboardConfig)
          : DEFAULT_PROSPECTOR_DASHBOARD_CONFIG;

      // Best-effort: persist a reusable role template so future staff can select it.
      void upsertClientStaffRole(effectiveClientId, {
        name: roleLabel,
        enabled_modules: finalEnabledModules,
      }).then((saved) => {
        if (!saved) return;
        const savedModulesRaw = Array.isArray(saved.enabled_modules) ? saved.enabled_modules : finalEnabledModules;
        const savedModules = savedModulesRaw.filter((id) => allowedSet.has(id));
        const normalizedSavedModules = savedModules.length > 0 ? savedModules : allowedModules;
        setRoleTemplates((prev) => {
          const idx = prev.findIndex((r) => r.name.trim().toLowerCase() === saved.name.trim().toLowerCase());
          const next = [...prev];
          if (idx >= 0) {
            next[idx] = { name: saved.name, enabledModules: normalizedSavedModules };
          } else {
            next.push({ name: saved.name, enabledModules: normalizedSavedModules });
          }
          return next.sort((a, b) => a.name.localeCompare(b.name));
        });
      });

        const created = await createClientStaff(effectiveClientId, {
          branch_id: branchId,
          name: newStaff.name,
          email: newStaff.email,
          role: roleLabel,
          enabled_modules: finalEnabledModules,
          basic_wage: newStaff.basicWage ?? null,
          employer_nics: newStaff.employerNICs ?? null,
          employer_pension: newStaff.employerPension ?? null,
          holiday_allowance: newStaff.holidayAllowance ?? null,
          commission_breakdown: (newStaff as any).commissionBreakdown ?? null,
          prospector_dashboard_config: resolvedProspectorConfig,
        });

      if (!created) {
        alert('Failed to create staff member in Supabase.');
        return;
      }

      const branchNameById = new Map(branchOptions.map((b) => [b.id, b.name] as const));
      const mapped = mapClientRowToStaff(created, branchNameById);
      setStaffMembers(prev => [...prev, mapped]);

      if (newStaff.email) {
        const inviteAgencyId = resolvedAgencyId ?? (await resolveAgencyIdForUser(user));
        void inviteUserByEmail(newStaff.email, invitationRole, inviteAgencyId ?? undefined, {
          name: newStaff.name,
          branch: newStaff.branch,
          client_id: effectiveClientId,
          branch_id: branchId ?? undefined,
          staff_id: created.id,
        });
      }

      return;
    }

    // Agency mode: persist to staff_members
    if (!resolvedAgencyId) return;

    // Prevent duplicate email entries
    const existingByEmailAgency = staffMembers.find(
      (s) => s.email.trim().toLowerCase() === newStaff.email.trim().toLowerCase()
    );
    if (existingByEmailAgency) {
      alert(`A staff member with email "${newStaff.email}" already exists (${existingByEmailAgency.name}). Please use a different email.`);
      return;
    }

      const created = await createStaffMember(resolvedAgencyId, {
        name: newStaff.name,
        role: newStaff.role,
        branchName: newStaff.branch,
        email: newStaff.email,
        phone: newStaff.phone,
        avatarUrl: newStaff.avatar,
        basicWage: newStaff.basicWage,
        employerNICs: newStaff.employerNICs,
        employerPension: newStaff.employerPension,
        holidayAllowance: newStaff.holidayAllowance,
        commissionBreakdown: (newStaff as any).commissionBreakdown,
      });

    if (!created) {
      alert('Failed to create staff member in Supabase.');
      return;
    }

    const mapped = mapRowToStaff(created);
    setStaffMembers(prev => [...prev, mapped]);

    if (newStaff.email) {
      const appRole = mapStaffRoleToAppRole(newStaff.role);
      void inviteUserByEmail(newStaff.email, appRole, resolvedAgencyId, {
        name: newStaff.name,
        branch: newStaff.branch,
      });
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    const ok = await confirmDialog('Remove this staff member? This cannot be undone.', {
      title: 'Remove staff member?',
      confirmText: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;

    if (shouldUseClientMode && effectiveClientId) {
      await deleteClientStaff(staffId);
    } else if (resolvedAgencyId) {
      await deleteStaffMember(staffId);
    }

    setStaffMembers(prev => prev.filter(s => s.id !== staffId));
    if (selectedStaff === staffId) {
      setSelectedStaff(null);
    }
  };

  const filteredStaff = staffMembersWithMetrics.filter(staff => {
    const matchesBranch = branchName ? staff.branch === branchName : true;
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.branch.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesBranch && matchesSearch;
  });

  return (
    <div className={cn("space-y-4 relative z-10", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2 mb-6">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            <TabsTrigger 
              value="staff" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Staff
            </TabsTrigger>
            <TabsTrigger 
              value="league-table" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Staff League Table
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Staff Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="staff" className="mt-0 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {!isMobile && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                'gap-2',
                viewMode === 'grid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <LayoutGridIcon className="h-4 w-4" strokeWidth={1.5} />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                'gap-2',
                viewMode === 'list' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <ListIcon className="h-4 w-4" strokeWidth={1.5} />
              List
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 w-full md:w-auto">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                className="pl-9 h-9 w-64 bg-background text-foreground shadow-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground h-9 w-9 shadow-sm"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}

          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 md:flex-none"
            onClick={() => setAddDialogOpen(true)}
            disabled={!canCreateStaff}
          >
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Add Staff Member
          </Button>
        </div>
      </div>

      <div className={cn(
        'grid gap-4',
        isMobile ? 'grid-cols-3' : (viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col max-w-4xl mx-auto w-full')
      )}>
        {filteredStaff.map((staff) => isMobile ? (
          <Card
            key={staff.id}
            className={cn(
              'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col items-center justify-center p-4 text-center',
              selectedStaff === staff.id && 'ring-2 ring-primary'
            )}
            onClick={() => handleStaffClick(staff)}
          >
            <div className="relative mb-2">
              <img
                src={staff.avatar}
                alt={staff.name}
                className="h-16 w-16 rounded-full object-cover"
              />
              <span className={cn(
                'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                statusColors[staff.status]
              )} />
            </div>
            <p className="text-sm font-semibold text-foreground truncate w-full">{staff.name}</p>
          </Card>
        ) : (
          viewMode === 'grid' ? (
            <Card
              key={staff.id}
              className={cn(
                'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-lg',
                selectedStaff === staff.id && 'ring-2 ring-primary'
              )}
              onClick={() => handleStaffClick(staff)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="relative">
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className={cn(
                      'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                      statusColors[staff.status]
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-foreground truncate">
                      {staff.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {staff.role}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {staff.branch}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                    <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                    <DropdownMenuItem 
                      className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      onClick={(e) => handleEditClick(staff, e)}
                    >
                      <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Edit Profile
                    </DropdownMenuItem>

                    {agencyId && (
                      <DropdownMenuItem
                        className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrillInToDashboard(staff);
                        }}
                      >
                        <LayoutDashboardIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        View Dashboard
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem className="text-foreground hover:bg-accent hover:text-accent-foreground">
                      View Performance
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRemoveStaff(staff.id);
                      }}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

                <CardContent className="space-y-4">
                  {/* Achievement Badges */}
                  {staffMonthlyWins[staff.id] && staffMonthlyWins[staff.id].length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
                      {staffMonthlyWins[staff.id].map((win, idx) => (
                        <div 
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-800"
                        >
                          <TrophyIcon className="h-3 w-3 text-yellow-600 dark:text-yellow-500" strokeWidth={2} />
                          <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                            {win.month}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MailIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-foreground truncate">{staff.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-foreground">{staff.phone}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-lg font-semibold text-foreground">{staff.activeListings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-lg font-semibold text-foreground">{staff.completedDeals}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-semibold text-success">
                    {formatCurrencyCompact(staff.totalRevenue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card
              key={staff.id}
              className={cn(
                'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 group',
                selectedStaff === staff.id && 'ring-2 ring-primary'
              )}
              onClick={() => handleStaffClick(staff)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Avatar & Status */}
                  <div className="relative shrink-0">
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      className="h-12 w-12 rounded-full object-cover border border-border"
                    />
                    <span className={cn(
                      'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                      statusColors[staff.status]
                    )} />
                  </div>
                  
                  {/* Main Info */}
                  <div className="flex-1 min-w-0 grid gap-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-foreground truncate tracking-tight">
                        {staff.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-muted/50 border border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {staff.role}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{staff.branch}</span>
                      </div>
                      <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="flex items-center gap-1.5">
                        <MailIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics & Actions */}
                  <div className="flex items-center gap-6 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 mt-1 sm:mt-0">
                     {/* Achievement Badges */}
                     {staffMonthlyWins[staff.id] && staffMonthlyWins[staff.id].length > 0 && (
                        <div className="hidden lg:flex -space-x-2">
                          {staffMonthlyWins[staff.id].map((win, idx) => (
                            <div 
                              key={idx}
                              className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border-2 border-card flex items-center justify-center"
                              title={win.month}
                            >
                              <TrophyIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-500" strokeWidth={2} />
                            </div>
                          ))}
                        </div>
                      )}

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Active</p>
                      <p className="text-lg font-bold text-foreground">{staff.activeListings}</p>
                    </div>
                    
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Revenue</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyCompact(staff.totalRevenue)}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={(e) => handleEditClick(staff, e)}
                        >
                          <EditIcon className="h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>

                        {agencyId && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDrillInToDashboard(staff);
                            }}
                          >
                            <LayoutDashboardIcon className="h-4 w-4" /> View Dashboard
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem className="gap-2">
                          <TrendingUpIcon className="h-4 w-4" /> View Performance
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemoveStaff(staff.id);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
            No staff members found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search query
          </p>
        </div>
      )}

      <EditStaffDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        staff={staffToEdit} 
        onSave={handleSaveStaff}
        branches={branchOptions}
        availableModules={availableModuleIds}
        canEditModules={canEditModules}
        canEditProspectorDashboard={canEditProspectorDashboard}
      />

      <AddStaffDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddStaff}
        branches={branchOptions}
        roleTemplates={roleTemplates}
        availableModules={availableModuleIds}
        isBranchManager={userRole === 'branch_manager'}
        defaultBranch={branchName ?? (user?.user_metadata as any)?.branch}
        canEditProspectorDashboard={canEditProspectorDashboard}
      />

          {staffToView && (
            <StaffPerformanceDetailView
              staff={staffToView}
              onClose={() => setStaffToView(null)}
              agencyId={resolvedAgencyId ?? undefined}
              clientId={effectiveClientId ?? undefined}
              branchId={branchOptions.find((branch) => branch.name === staffToView.branch)?.id}
              availableModules={availableModuleIds}
              canEditModules={canEditModules}
              canEditProspectorDashboard={canEditProspectorDashboard}
              onSaveStaff={handleSaveStaff}
            />
          )}
        </TabsContent>

        <TabsContent value="league-table" className="mt-0">
          <StaffLeagueTableView agencyId={resolvedAgencyId ?? undefined} />
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <StaffPerformanceSummaryView initialSelectedStaffId="all" agencyId={resolvedAgencyId ?? undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
