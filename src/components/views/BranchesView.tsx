import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2Icon,
  MapPinIcon,
  UsersIcon,
  HomeIcon,
  PlusIcon,
  SearchIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  LayoutGridIcon,
  ListIcon,
  XIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BranchDetailView } from '../BranchDetailView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BranchLeagueTableView } from './BranchLeagueTableView';
import { BranchPerformanceSummaryView } from './BranchPerformanceSummaryView';
import { AddBranchDialog } from '../AddBranchDialog';
import {
  BranchRow,
  fetchBranches,
  createBranch as createBranchApi,
  updateBranch as updateBranchApi,
  deleteBranch as deleteBranchApi,
  ClientBranchRow,
  fetchClientBranches,
  createClientBranch,
  updateClientBranch,
  deleteClientBranch,
  fetchBranchLimitForClient,
  fetchClientStaffForClient,
} from '@/lib/ownerApi';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { useAuthStore } from '@/stores/authStore';
import { resolveAgencyIdForUser, resolveClientIdForUser } from '@/lib/dashboardApi';
import { useDashboardStore } from '@/stores/dashboardStore';
import { confirmDialog } from '@/hooks/use-confirm';
import { getUserRole } from '@/lib/ownerAccess';

const DEFAULT_ENABLED_MODULES = DASHBOARD_MODULES.map((m) => m.id);

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  manager: string;
  teamSize: number;
  activeListings: number;
  totalSales: number;
  phone: string;
  email: string;
  status?: 'active' | 'inactive';
  enabledModules?: string[];
}

// No static demo branches; always load from Supabase.

type ViewMode = 'grid' | 'list';

interface BranchesViewProps {
  agencyId?: string;
}

export function BranchesView({ agencyId }: BranchesViewProps) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { clientId: clientIdFromStore, clientScopeIds, agencyId: agencyIdFromStore } = useDashboardStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('branches');
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [resolvedAgencyId, setResolvedAgencyId] = useState<string | null>(agencyId ?? agencyIdFromStore ?? null);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [branchLimit, setBranchLimit] = useState<number | null>(null);
  
  const userRole = getUserRole(user);
  // Check if user has client_id in metadata (indicates they're a client, regardless of role name)
  const hasClientMetadata = !!(user?.user_metadata as any)?.client_id || !!(user?.app_metadata as any)?.client_id;
  const isClientUser = userRole === 'client' || userRole === 'agency_user' || hasClientMetadata;
  // Prefer the explicit client selection from the dashboard store (owner "Login as") when present.
  const effectiveClientId = isClientUser ? (resolvedClientId ?? clientIdFromStore) : clientIdFromStore;
  const effectiveClientScope = isClientUser
    ? (clientScopeIds && clientScopeIds.length > 0 ? clientScopeIds : effectiveClientId ? [effectiveClientId] : [])
    : (effectiveClientId ? [effectiveClientId] : []);
  const branchLimitReached = branchLimit !== null && branches.length >= branchLimit;
  const shouldUseClientMode = isClientUser || !!effectiveClientId;
  const canCreateBranch = shouldUseClientMode ? !!effectiveClientId : !!resolvedAgencyId;

  // Debug: Log all context variables to diagnose "No branches found" issue
  console.log('[BranchesView] Debug:', {
    userRole,
    isClientUser,
    resolvedClientId,
    clientIdFromStore,
    effectiveClientId,
    agencyIdFromStore,
    resolvedAgencyId,
    shouldUseClientMode,
    branchesCount: branches.length,
  });

  const mapRowToBranch = (row: BranchRow): Branch => ({
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    city: row.city ?? '',
    postcode: row.postcode ?? '',
    manager: row.manager ?? '',
    teamSize: row.team_size ?? 0,
    activeListings: row.active_listings ?? 0,
    totalSales: Number(row.total_sales ?? 0),
    phone: row.phone ?? '',
    email: row.email ?? '',
    status: (row.status as Branch['status']) ?? 'active',
    enabledModules: ((row.enabled_modules as string[] | null) ?? DEFAULT_ENABLED_MODULES) as string[],
  });

  const mapClientBranchToBranch = (row: ClientBranchRow, staffCount: number = 0): Branch => ({
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    city: '',
    postcode: '',
    manager: '',
    teamSize: staffCount,
    activeListings: 0,
    totalSales: 0,
    phone: row.phone ?? '',
    email: row.email ?? '',
    status: 'active',
    enabledModules: ((row.enabled_modules as string[] | null) ?? DEFAULT_ENABLED_MODULES) as string[],
  });

  const handleAddBranch = async (newBranchRaw: any) => {
    const newBranch: Branch = {
      ...(newBranchRaw as Branch),
      status: (newBranchRaw?.status as Branch['status']) ?? 'active',
      enabledModules: (newBranchRaw?.enabledModules as string[] | undefined) ?? DEFAULT_ENABLED_MODULES,
    };

    // Client mode: create client branch
    if (branchLimitReached) {
      alert(branchLimit !== null
        ? `Branch limit reached (${branchLimit}). Please contact the owner to increase it.`
        : 'Branch limit reached.');
      return;
    }
    if (!effectiveClientId && shouldUseClientMode) {
      alert('No client context found. Please reload or log in again.');
      return;
    }
    if (!effectiveClientId && !resolvedAgencyId) {
      alert('No client or agency context found. Please reload.');
      return;
    }
    if (effectiveClientId) {
      const created = await createClientBranch(effectiveClientId, {
        name: newBranch.name,
        address: newBranch.address,
        phone: newBranch.phone,
        email: newBranch.email,
        enabled_modules: newBranch.enabledModules ?? DEFAULT_ENABLED_MODULES,
      });

      if (!created) {
        alert('Could not create branch.');
        return;
      }

      setBranches(prev => [...prev, mapClientBranchToBranch(created)]);
      return;
    }

    // Agency mode: create agency branch
    if (!resolvedAgencyId) {
      setBranches((prev) => [...prev, newBranch]);
      return;
    }

    const created = await createBranchApi(resolvedAgencyId, {
      name: newBranch.name,
      address: newBranch.address,
      city: newBranch.city,
      postcode: newBranch.postcode,
      manager: newBranch.manager,
      teamSize: newBranch.teamSize,
      activeListings: newBranch.activeListings,
      totalSales: newBranch.totalSales,
      phone: newBranch.phone,
      email: newBranch.email,
      status: newBranch.status ?? 'active',
      enabledModules: newBranch.enabledModules ?? DEFAULT_ENABLED_MODULES,
    });

    if (!created) {
      alert('Could not create branch.');
      return;
    }

    setBranches(prev => [...prev, mapRowToBranch(created)]);
  };

  const handleUpdateBranch = async (updatedBranch: Branch) => {
    const normalized: Branch = {
      ...updatedBranch,
      status: updatedBranch.status ?? 'active',
      enabledModules: updatedBranch.enabledModules ?? DEFAULT_ENABLED_MODULES,
    };

    // Client mode: update client branch
    if (isClientUser && resolvedClientId) {
      const saved = await updateClientBranch(normalized.id, {
        name: normalized.name,
        address: normalized.address,
        phone: normalized.phone,
        email: normalized.email,
        enabled_modules: normalized.enabledModules,
      });

      if (!saved) {
        alert('Could not update branch.');
        return;
      }

      // Preserve the current staff count when updating
      const currentBranch = branches.find(b => b.id === saved.id);
      const mapped = mapClientBranchToBranch(saved, currentBranch?.teamSize || 0);
      setBranches(prev => prev.map(branch => (branch.id === mapped.id ? mapped : branch)));
      setSelectedBranch(mapped);
      return;
    }

    // Agency mode: update agency branch
    if (!resolvedAgencyId) {
      setBranches((prev) => prev.map((branch) => (branch.id === normalized.id ? normalized : branch)));
      setSelectedBranch(normalized);
      return;
    }

    const saved = await updateBranchApi(normalized.id, {
      name: normalized.name,
      address: normalized.address,
      city: normalized.city,
      postcode: normalized.postcode,
      manager: normalized.manager,
      teamSize: normalized.teamSize,
      activeListings: normalized.activeListings,
      totalSales: normalized.totalSales,
      phone: normalized.phone,
      email: normalized.email,
      status: normalized.status,
      enabledModules: normalized.enabledModules,
    });

    if (!saved) {
      alert('Could not update branch.');
      return;
    }

    const mapped = mapRowToBranch(saved);
    setBranches(prev => prev.map(branch => (branch.id === mapped.id ? mapped : branch)));
    setSelectedBranch(mapped);
  };

  const handleDeleteBranch = async (id: string) => {
    const ok = await confirmDialog('Are you sure you want to delete this branch?', {
      title: 'Delete branch?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    // Client mode: delete client branch
    if (isClientUser && resolvedClientId) {
      await deleteClientBranch(id);
    } else if (resolvedAgencyId) {
      // Agency mode: delete agency branch
      await deleteBranchApi(id);
    }

    setBranches((prev) => prev.filter((branch) => branch.id !== id));
    setSelectedBranch((prev) => (prev && prev.id === id ? null : prev));
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    const nextStatus: Branch['status'] = branch.status === 'inactive' ? 'active' : 'inactive';
    const verb = nextStatus === 'inactive' ? 'deactivate' : 'reactivate';

    const ok = await confirmDialog(`Are you sure you want to ${verb} ${branch.name}?`, {
      title: 'Confirm action',
      confirmText: verb === 'deactivate' ? 'Deactivate' : 'Reactivate',
      variant: verb === 'deactivate' ? 'destructive' : 'default',
    });
    if (!ok) return;

    await handleUpdateBranch({
      ...branch,
      status: nextStatus,
    });
  };

  // Force grid view on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
    }
  }, [isMobile]);

  // Load branches from Supabase when an agency is available; otherwise use demo data
  useEffect(() => {
    const loadBranches = async () => {
      // Client mode: show only client branches
      if (shouldUseClientMode) {
        if (!effectiveClientId) {
          setBranches([]);
          return;
        }
        const [branchRows, staffRows] = await Promise.all([
          fetchClientBranches(effectiveClientScope.length > 0 ? effectiveClientScope : effectiveClientId),
          fetchClientStaffForClient(effectiveClientScope.length > 0 ? effectiveClientScope : effectiveClientId),
        ]);
        
        // Count staff per branch
        const staffCountByBranch = new Map<string, number>();
        staffRows.forEach((staff) => {
          if (staff.branch_id) {
            staffCountByBranch.set(
              staff.branch_id,
              (staffCountByBranch.get(staff.branch_id) || 0) + 1
            );
          }
        });
        
        setBranches(branchRows.map((row) => 
          mapClientBranchToBranch(row, staffCountByBranch.get(row.id) || 0)
        ));
        return;
      }

      // Agency mode: fetch agency branches
      if (!resolvedAgencyId) {
        setBranches([]);
        return;
      }

      const rows = await fetchBranches(resolvedAgencyId);
      setBranches(rows.map(mapRowToBranch));
    };

    void loadBranches();
  }, [resolvedAgencyId, effectiveClientId, effectiveClientScope, shouldUseClientMode]);
  // Resolve clientId for client/agency users
  useEffect(() => {
    if (!isClientUser) {
      setResolvedClientId(null);
      return;
    }
    if (!user) return;

    let cancelled = false;
    const run = async () => {
      // If user has client_id in metadata, use that directly
      const metaClientId = (user.user_metadata as any)?.client_id || (user.app_metadata as any)?.client_id;
      if (metaClientId) {
        if (!cancelled) {
          setResolvedClientId(metaClientId);
        }
        return;
      }
      
      // Otherwise resolve from database
      const resolved = await resolveClientIdForUser(user);
      if (!cancelled) {
        setResolvedClientId(resolved);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isClientUser, user?.id, user?.email]);

  // Resolve agencyId when not provided (non-owner paths) or when owner impersonation sets it in the store
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
  // Load branch limit set by owner (if available)
  useEffect(() => {
    const loadLimit = async () => {
      if (!effectiveClientId) {
        setBranchLimit(null);
        return;
      }
      const limit = await fetchBranchLimitForClient(effectiveClientId, user?.email ?? null);
      setBranchLimit(limit);
    };
    void loadLimit();
  }, [effectiveClientId, user?.email]);

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.manager.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn("space-y-4 relative z-10", isMobile ? "p-4" : "p-6 md:p-8")}>
      {selectedBranch && (
        <BranchDetailView
          branch={selectedBranch}
          agencyId={resolvedAgencyId ?? undefined}
          clientId={effectiveClientId ?? undefined}
          onClose={() => setSelectedBranch(null)}
          onUpdateBranch={handleUpdateBranch}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2 mb-6">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            <TabsTrigger 
              value="branches" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Branches
            </TabsTrigger>
            <TabsTrigger 
              value="league-table" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Branch League Table
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Branch Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="branches" className="mt-0 space-y-4">
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
                placeholder="Search branches..."
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
            onClick={() => setAddBranchOpen(true)}
            disabled={branchLimitReached || !canCreateBranch}
          >
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Add Branch
          </Button>
          {branchLimit !== null && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {branches.length}/{branchLimit} branches {branchLimitReached ? '• limit reached' : ''}
            </span>
          )}
        </div>
      </div>

      <div className={cn(
        'gap-4',
        isMobile ? 'grid grid-cols-3' : (viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col max-w-4xl mx-auto w-full')
      )}>
        {filteredBranches.map((branch) => isMobile ? (
          <Card
            key={branch.id}
            className={cn(
              'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col items-center justify-center p-4 text-center',
              branch.status === 'inactive' && 'opacity-60',
              selectedBranch?.id === branch.id && 'ring-2 ring-primary'
            )}
            onClick={() => setSelectedBranch(branch)}
          >
            <div className="relative mb-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground truncate w-full">{branch.name}</p>
          </Card>
        ) : (
          viewMode === 'grid' ? (
            <Card
              key={branch.id}
              className={cn(
                'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-lg',
                selectedBranch?.id === branch.id && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedBranch(branch)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Building2Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <span className="truncate">{branch.name}</span>
                      {branch.status === 'inactive' && (
                        <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {branch.city}
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
                    <DropdownMenuItem className="text-foreground hover:bg-accent hover:text-accent-foreground">
                      <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Edit Branch
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setSelectedBranch(branch)}
                    >
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleToggleBranchStatus(branch)}
                    >
                      {branch.status === 'inactive' ? (
                        <PlayCircleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <PauseCircleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      )}
                      {branch.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteBranch(branch.id)}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5" strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-foreground">{branch.address}</p>
                      <p className="text-muted-foreground">{branch.postcode}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-foreground">
                      {branch.manager} • {branch.teamSize} team members
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Listings</p>
                    <p className="text-lg font-semibold text-foreground">{branch.activeListings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-lg font-semibold text-foreground">
                      £{(branch.totalSales / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm text-foreground">{branch.phone}</p>
                  <p className="text-sm text-foreground">{branch.email}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Card
            key={branch.id}
            className={cn(
              'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 group',
              selectedBranch?.id === branch.id && 'ring-2 ring-primary'
            )}
            onClick={() => setSelectedBranch(branch)}
          >
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Main Info */}
                <div className="flex-1 min-w-0 grid gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-foreground truncate tracking-tight">
                      {branch.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      {branch.city}
                    </span>
                    {branch.status === 'inactive' && (
                      <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{branch.address}, {branch.postcode}</span>
                    </div>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <div className="flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span>{branch.manager} <span className="text-gray-400">•</span> {branch.teamSize} Staff</span>
                    </div>
                  </div>
                </div>

                {/* Metrics & Actions */}
                <div className="flex items-center gap-6 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 mt-1 sm:mt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Listings</p>
                    <p className="text-lg font-bold text-foreground">{branch.activeListings}</p>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Sales</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      £{(branch.totalSales / 1000000).toFixed(1)}M
                    </p>
                  </div>

                  <div className="hidden lg:block text-right min-w-[140px]">
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-sm font-medium text-foreground">{branch.phone}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[140px]">{branch.email}</span>
                    </div>
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
                      <DropdownMenuItem className="gap-2">
                        <EditIcon className="h-4 w-4" /> Edit Branch
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setSelectedBranch(branch)}>
                        <HomeIcon className="h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => handleToggleBranchStatus(branch)}>
                        {branch.status === 'inactive' ? (
                          <PlayCircleIcon className="h-4 w-4" />
                        ) : (
                          <PauseCircleIcon className="h-4 w-4" />
                        )}
                        {branch.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive gap-2"
                        onClick={() => handleDeleteBranch(branch.id)}
                      >
                        <TrashIcon className="h-4 w-4" /> Delete
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

          {filteredBranches.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
              <Building2Icon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
              <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
                No branches found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search query
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="league-table" className="mt-0">
          <BranchLeagueTableView agencyId={resolvedAgencyId ?? undefined} />
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <BranchPerformanceSummaryView initialSelectedBranchId="all" agencyId={resolvedAgencyId ?? undefined} />
        </TabsContent>
      </Tabs>

      <AddBranchDialog 
        open={addBranchOpen} 
        onOpenChange={setAddBranchOpen} 
        onSave={handleAddBranch} 
      />
    </div>
  );
}
