import { useState, useEffect } from 'react';
import { PlusIcon, XIcon, SearchIcon, FilterIcon, SlidersHorizontalIcon, ClockIcon, Building2Icon, TrendingUpIcon, MapIcon, ListIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from './DateRangePicker';
import { BranchSelect } from './BranchSelect';
import { StatusSelect } from './StatusSelect';
import { AddPropertyDialog, AddPropertyFormData } from './AddPropertyDialog';
import { DataTabs } from './DataTabs';
import { useDashboardStore, MovementStatus } from '@/stores/dashboardStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChooseMovementTypeDialog } from './ChooseMovementTypeDialog';
import { B2BReferralDialog } from './B2BReferralDialog';
import { cn } from '@/lib/utils';
import { createMovement, MovementInput, resolveClientIdForUser } from '@/lib/dashboardApi';
import { createDiaryEvent as createDiaryEventRow } from '@/lib/diaryApi';
import { fetchBranches, fetchClientBranches, createB2BReferral, fetchClientStaffForClient, fetchClientStaffForAgency, type ClientStaffRow } from '@/lib/ownerApi';
import { fetchB2BCompanies } from '@/lib/b2bApi';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';
import { buildAppointmentDateTime } from '@/lib/appointmentDateTime';
import { uploadDocumentsToMovement } from '@/lib/movementDocuments';

const TEAM_MEMBER_LABELS: Record<string, string> = {
  sarah: 'Sarah Johnson',
  michael: 'Michael Brown',
  emma: 'Emma Wilson',
  david: 'David Lee',
};

const SEARCH_COLLAPSE_BREAKPOINT = 780;

const parseNumber = (value: string): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};

async function createMovementFromForm(
  agencyId: string,
  status: MovementStatus,
  form: AddPropertyFormData,
  reloadMovements: (agencyId: string, clientId?: string) => Promise<void>,
  clientId?: string | null
) {
  const movementType = form.salesOrLettings === 'lettings' ? 'letting' : 'sale';
  const today = new Date().toISOString().split('T')[0];

  // For valuations the movement date is always today;
  // the appointment date/time goes into the diary instead.
  const movementDate = status === 'valuation' ? today : (form.appointmentDate || today);

  const isLettings = movementType === 'letting';
  const isLetOnly = isLettings && form.lettingType === 'let-only';
  const isFullyManaged = isLettings && form.lettingType === 'fully-managed';

  const feeAmount =
    isLetOnly
      ? parseNumber(form.letOnlyFee)
      : isFullyManaged && form.monthlyManagedFeeType !== 'percentage'
      ? parseNumber(form.monthlyManagedFee)
      : form.typeOfFee === 'fixed'
      ? parseNumber(form.feeAmount)
      : null;

  const feePercentage =
    isFullyManaged && form.monthlyManagedFeeType === 'percentage'
      ? parseNumber(form.monthlyManagedFee)
      : form.typeOfFee === 'percentage'
      ? parseNumber(form.feePercentage)
      : null;

  const input: MovementInput = {
    branch_id: form.branch || null,
    property: form.description || undefined,
    address: form.address || undefined,
    type: movementType,
    status,
    price: parseNumber(form.price),
    fee_percentage: feePercentage,
    fee_amount: feeAmount,
    date: movementDate,
    agent: TEAM_MEMBER_LABELS[form.teamMember] || form.teamMember || undefined,
    board: false,
    notes: undefined,
    motivated_seller: form.motivatedSeller || undefined,
  };

  // Pass clientId for proper data isolation
  const created = await createMovement(agencyId, input, clientId ?? undefined);
  if (!created) {
    alert('Failed to create movement in Supabase.');
    return;
  }

  // For valuations, also create a diary event on the appointment date/time
  if (status === 'valuation' && form.appointmentDate) {
    try {
      const startAt = buildAppointmentDateTime(form.appointmentDate, form.appointmentTime);
      if (!startAt) {
        console.warn('Skipping valuation diary event due to invalid appointment date/time', {
          appointmentDate: form.appointmentDate,
          appointmentTime: form.appointmentTime,
        });
        await reloadMovements(agencyId, clientId ?? undefined);
        return;
      }
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 hour duration

      await createDiaryEventRow({
        agency_id: agencyId,
        client_id: clientId ?? null,
        branch_id: form.branch || null,
        staff_id: null,
        title: 'Valuation',
        description: form.description || null,
        category: 'valuation',
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        all_day: false,
        location: form.address || null,
        vendor_name: form.vendorName || null,
        property_address: form.address || null,
      });
    } catch (diaryError) {
      console.error('Error creating diary entry for valuation movement:', diaryError);
    }
  }

  await reloadMovements(agencyId, clientId ?? undefined);
}

const getB2BReferralStatus = (companyType?: string): MovementStatus => {
  const normalized = (companyType ?? '').toLowerCase();
  if (normalized.includes('aml')) return 'aml-referral';
  if (normalized.includes('legal') || normalized.includes('convey')) return 'legal-referral';
  if (normalized.includes('mortgage')) return 'mortgage-referral';
  return 'mortgage-referral';
};

export function FilterRow() {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const userRole = getUserRole(user);
  const isClientUser = userRole === 'client' || userRole === 'agency_user';
  const isBranchManager = userRole === 'branch_manager';
  const branchIdFromMeta = (user?.user_metadata as any)?.branch_id as string | undefined;
  const {
    clearFilters,
    dateRange,
    compareDateRange,
    isComparingDates,
    selectedBranch,
    selectedStatus,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    agencyId,
    loadMovements,
    loadStaffMembers,
  } = useDashboardStore();
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchCanCollapse, setSearchCanCollapse] = useState(true);
  const [addPropertyDialogOpen, setAddPropertyDialogOpen] = useState(false);
  const [chooseMovementTypeDialogOpen, setChooseMovementTypeDialogOpen] = useState(false);
  const [preselectedMovementStatus, setPreselectedMovementStatus] = useState<MovementStatus | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [b2bReferralDialogOpen, setB2bReferralDialogOpen] = useState(false);
  const [valuationFormOpen, setValuationFormOpen] = useState(false);
  const [b2bCompanies, setB2bCompanies] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [valuationFormData, setValuationFormData] = useState<{ date?: Date; time?: string }>({});
  
  const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [clientStaff, setClientStaff] = useState<ClientStaffRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  
  const hasActiveFilters = 
    dateRange.from || 
    dateRange.to || 
    (isComparingDates && (compareDateRange.from || compareDateRange.to)) ||
    selectedBranch !== 'all' ||
    selectedStatus !== 'all';

  const handleOpenAddPropertyDialog = (status: MovementStatus) => {
    setPreselectedMovementStatus(status);
    setAddPropertyDialogOpen(true);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${SEARCH_COLLAPSE_BREAKPOINT - 1}px)`);
    const syncSearchMode = () => {
      const canCollapse = window.innerWidth < SEARCH_COLLAPSE_BREAKPOINT;
      setSearchCanCollapse(canCollapse);
      if (!canCollapse) {
        setSearchOpen(true);
      }
    };

    syncSearchMode();
    mediaQuery.addEventListener('change', syncSearchMode);
    return () => mediaQuery.removeEventListener('change', syncSearchMode);
  }, []);

  // Resolve client id for client / branch manager users
  useEffect(() => {
    if (!user || (!isClientUser && !isBranchManager)) {
      setResolvedClientId(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const metaClientId =
        (user.user_metadata as any)?.client_id ??
        (user.app_metadata as any)?.client_id ??
        null;

      if (metaClientId && isBranchManager) {
        if (!cancelled) setResolvedClientId(metaClientId);
        return;
      }

      const resolved = await resolveClientIdForUser(user);
      if (!cancelled) setResolvedClientId(resolved);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, isClientUser, isBranchManager]);

  // Load real branches for this agency or client so movement dialog can use live data
  useEffect(() => {
    const loadBranches = async () => {
      if (isClientUser || isBranchManager) {
        const clientId =
          resolvedClientId ??
          (user?.user_metadata as any)?.client_id ??
          (user?.app_metadata as any)?.client_id ??
          null;
        if (!clientId) {
          setBranchOptions([]);
          return;
        }
        setBranchesLoading(true);
        const rows = await fetchClientBranches(clientId);
        let options = rows.map((b) => ({ id: b.id, name: b.name }));
        if (isBranchManager && branchIdFromMeta) {
          const match = options.find((b) => b.id === branchIdFromMeta);
          if (match) options = [match];
        }
        setBranchOptions(options);
        setBranchesLoading(false);
        return;
      }

      if (!agencyId) {
        setBranchOptions([]);
        return;
      }
      setBranchesLoading(true);
      const rows = await fetchBranches(agencyId);
      setBranchOptions(rows.map((b) => ({ id: b.id, name: b.name })));
      setBranchesLoading(false);
    };
    void loadBranches();
  }, [agencyId, resolvedClientId, isClientUser, isBranchManager, branchIdFromMeta, user?.user_metadata, user?.app_metadata]);

  // Load staff members when agencyId is available
  useEffect(() => {
    if (agencyId) {
      loadStaffMembers(agencyId);
    }
  }, [agencyId, loadStaffMembers]);

  // Load client staff for the team member dropdown in AddPropertyDialog
  useEffect(() => {
    const loadClientStaff = async () => {
      // For client users or branch managers, load from client_staff table
      if (isClientUser || isBranchManager) {
        const clientId =
          resolvedClientId ??
          (user?.user_metadata as any)?.client_id ??
          (user?.app_metadata as any)?.client_id ??
          null;
        if (!clientId) {
          setClientStaff([]);
          return;
        }
        setStaffLoading(true);
        const staff = await fetchClientStaffForClient(clientId);
        setClientStaff(staff);
        setStaffLoading(false);
        return;
      }

      // For agency users, load client staff via agency
      if (agencyId) {
        setStaffLoading(true);
        const staff = await fetchClientStaffForAgency(agencyId);
        setClientStaff(staff);
        setStaffLoading(false);
      }
    };
    void loadClientStaff();
  }, [resolvedClientId, agencyId, isClientUser, isBranchManager, user?.user_metadata, user?.app_metadata]);

  // Listen for B2B referral event
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleOpenB2BReferral = () => {
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Use requestAnimationFrame to ensure DOM is stable
      requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          setB2bReferralDialogOpen(true);
        }, 200);
      });
    };

    window.addEventListener('open-b2b-referral', handleOpenB2BReferral as EventListener);
    return () => {
      window.removeEventListener('open-b2b-referral', handleOpenB2BReferral as EventListener);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Listen for valuation form event from calendar
  useEffect(() => {
    const handleOpenValuationForm = (e: Event) => {
      console.log('FilterRow: Event received:', e.type);
      const customEvent = e as CustomEvent;
      console.log('FilterRow: Custom event detail:', customEvent.detail);
      
      if (customEvent.detail) {
        console.log('FilterRow: Setting form data and opening dialog');
        setValuationFormData(customEvent.detail);
        setValuationFormOpen(true);
      } else {
        console.warn('FilterRow: No detail in custom event');
      }
    };

    const handleForceOpen = () => {
      console.log('FilterRow: Force open event received');
      setValuationFormOpen(true);
    };

    console.log('FilterRow: Registering event listeners');
    window.addEventListener('open-valuation-form', handleOpenValuationForm as EventListener);
    window.addEventListener('force-open-valuation-form', handleForceOpen);
    
    return () => {
      console.log('FilterRow: Removing event listeners');
      window.removeEventListener('open-valuation-form', handleOpenValuationForm as EventListener);
      window.removeEventListener('force-open-valuation-form', handleForceOpen);
    };
  }, []);

  useEffect(() => {
    if (!agencyId) {
      setB2bCompanies([]);
      return;
    }

    fetchB2BCompanies(agencyId, resolvedClientId ?? undefined).then((list) =>
      setB2bCompanies(list.map((c) => ({ id: c.id, name: c.name, type: c.type })))
    );
  }, [agencyId, resolvedClientId]);

  const handleB2BReferralSave = async (data: {
    referredTo: string;
    propertyAddress: string;
    transactionType: string;
    date: string;
    link: string;
    documents: File[];
    contactName: string;
    notes: string;
  }) => {
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    // Find the company by name
    const company = b2bCompanies.find(c => c.name === data.referredTo);
    if (!company) {
      alert('Could not find the selected B2B company.');
      return;
    }

    try {
      const created = await createB2BReferral(
        agencyId,
        {
          company_id: company.id,
          property_address: data.propertyAddress,
          client_name: data.contactName,
          transaction_type: data.transactionType || undefined,
          referral_date: data.date,
          notes: data.notes || undefined,
          link: data.link || undefined,
          ...(isBranchManager && branchIdFromMeta ? { branch_id: branchIdFromMeta } : {}),
        },
        resolvedClientId ?? undefined
      );

      if (!created) {
        alert('Failed to create B2B referral.');
        return;
      }
      const referralNotes = [
        data.notes?.trim() ? data.notes.trim() : null,
        data.link?.trim() ? `Link: ${data.link.trim()}` : null,
        `Referred to: ${company.name}`,
      ]
        .filter(Boolean)
        .join('\n');

      const movementInput: MovementInput = {
        branch_id: isBranchManager && branchIdFromMeta ? branchIdFromMeta : null,
        address: data.propertyAddress,
        property: data.contactName || company.name,
        type: 'sale',
        status: getB2BReferralStatus(company.type),
        date: data.date || new Date().toISOString().split('T')[0],
        agent: data.contactName || undefined,
        notes: referralNotes || undefined,
      };

      // Pass clientId for proper data isolation
      const createdMovement = await createMovement(agencyId, movementInput, resolvedClientId ?? undefined);
      if (!createdMovement) {
        alert('B2B referral created, but failed to add movement.');
        return;
      }

      const filesToUpload = Array.isArray(data.documents) ? data.documents : [];
      if (filesToUpload.length > 0) {
        const uploadResult = await uploadDocumentsToMovement({
          agencyId,
          movementId: createdMovement.id,
          files: filesToUpload,
          clientId: resolvedClientId ?? undefined,
          branchId: movementInput.branch_id ?? null,
          createdBy: user?.id ?? null,
        });

        if (uploadResult.uploadedCount === 0) {
          alert('B2B referral created, but failed to upload documents.');
        } else if (uploadResult.failedCount > 0) {
          alert(
            `B2B referral created. Uploaded ${uploadResult.uploadedCount}/${filesToUpload.length} documents.`
          );
        }
      }

      await loadMovements(agencyId, resolvedClientId ?? undefined);

      // Show success
      console.log('B2B Referral created successfully:', created);
    } catch (err) {
      console.error('Error creating B2B referral:', err);
      alert('Error creating B2B referral.');
    }
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card md:flex-row md:items-center md:justify-between", isMobile ? "p-3" : "p-4")}>
      {isMobile ? (
        <>
          <div className="flex items-center justify-between w-full">
            <DataTabs />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                title={viewMode === 'list' ? 'Switch to Map View' : 'Switch to List View'}
              >
                {viewMode === 'list' ? (
                  <MapIcon className="h-5 w-5" strokeWidth={1.5} />
                ) : (
                  <ListIcon className="h-5 w-5" strokeWidth={1.5} />
                )}
              </Button>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    <SearchIcon className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover text-popover-foreground" align="end">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      type="search"
                      placeholder="Quick search properties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-background text-foreground pl-10"
                      autoFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
              size="default"
              onClick={() => setChooseMovementTypeDialogOpen(true)}
            >
              <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
              Add Movement
            </Button>
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground flex-1"
                    >
                      <FilterIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] bg-card border-t-2 border-border rounded-t-3xl p-0 flex flex-col">
                    {/* Header */}
                    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border bg-card">
                      <div className="mb-2">
                        <SheetTitle className="text-foreground text-2xl font-bold">Filters</SheetTitle>
                        <p className="text-sm text-muted-foreground mt-1">Refine your movements view</p>
                      </div>
                      
                      {/* Active Filters Count */}
                      {hasActiveFilters && (
                        <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs font-medium text-primary">
                            {[dateRange.from, dateRange.to, selectedBranch !== 'all', selectedStatus !== 'all'].filter(Boolean).length} active filters
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <div className="space-y-6">
                        {/* Date Range Filter */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                              <CalendarIcon className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                            </div>
                            <Label htmlFor="date-range-filter" className="text-foreground font-semibold text-base">Date Range</Label>
                          </div>
                          <div className="w-full">
                            <DateRangePicker />
                          </div>
                        </div>

                        {/* Branch Filter */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 shrink-0">
                              <Building2Icon className="h-5 w-5 text-purple-600" strokeWidth={1.5} />
                            </div>
                            <Label htmlFor="branch-filter" className="text-foreground font-semibold text-base">Branch</Label>
                          </div>
                          <div className="w-full">
                            <BranchSelect />
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                              <TrendingUpIcon className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                            </div>
                            <Label htmlFor="status-filter" className="text-foreground font-semibold text-base">Status</Label>
                          </div>
                          <div className="w-full">
                            <StatusSelect />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="shrink-0 p-6 border-t border-border bg-card space-y-3">
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => { clearFilters(); setFilterSheetOpen(false); }}
                          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-12"
                        >
                          <XIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                          Clear All Filters
                        </Button>
                      )}
                      <Button 
                        size="lg" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg h-12 text-base font-semibold" 
                        onClick={() => setFilterSheetOpen(false)}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <div className="shrink-0">
              <DataTabs />
            </div>
            <div className="shrink-0">
              <DateRangePicker />
            </div>
            <div className="shrink-0">
              <BranchSelect />
            </div>
            <div className="shrink-0">
              <StatusSelect />
            </div>
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground shrink-0"
              >
                <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Clear Filters
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              title={viewMode === 'list' ? 'Switch to Map View' : 'Switch to List View'}
            >
              {viewMode === 'list' ? (
                <MapIcon className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <ListIcon className="h-5 w-5" strokeWidth={1.5} />
              )}
            </Button>

            {!searchCanCollapse || searchOpen ? (
              <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Quick search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (searchCanCollapse && !searchQuery) {
                      setSearchOpen(false);
                    }
                  }}
                  className="pl-9 h-9 w-64 bg-background text-foreground shadow-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                  onClick={() => {
                    setSearchQuery('');
                    if (searchCanCollapse) {
                      setSearchOpen(false);
                    }
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="default"
              onClick={() => setChooseMovementTypeDialogOpen(true)}
            >
              <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
              Add Movement
            </Button>
          </div>
        </>
      )}

      <AddPropertyDialog
        open={addPropertyDialogOpen}
        onOpenChange={setAddPropertyDialogOpen}
        preselectedStatus={preselectedMovementStatus}
        branches={branchOptions}
        branchesLoading={branchesLoading}
        defaultBranchId={isBranchManager ? branchIdFromMeta : undefined}
        lockBranch={!!(isBranchManager && branchIdFromMeta)}
        staffMembers={clientStaff.map((s) => ({ id: s.id, name: s.name, role: s.role, branch_id: s.branch_id }))}
        staffLoading={staffLoading}
        onSave={async (data) => {
          if (!data) return;
          if (!agencyId) {
            alert('No agency selected for this user.');
            return;
          }
          const status = preselectedMovementStatus ?? 'on-books';
          await createMovementFromForm(agencyId, status, data, loadMovements, resolvedClientId);
        }}
      />
      <ChooseMovementTypeDialog
        open={chooseMovementTypeDialogOpen}
        onOpenChange={setChooseMovementTypeDialogOpen}
        onSelect={handleOpenAddPropertyDialog}
      />

      <B2BReferralDialog
        open={b2bReferralDialogOpen}
        onOpenChange={setB2bReferralDialogOpen}
        onSave={handleB2BReferralSave}
        movementId="new"
        availableCompanies={b2bCompanies}
      />

      <AddPropertyDialog
        open={valuationFormOpen}
        onOpenChange={setValuationFormOpen}
        preselectedStatus="valuation"
        prefilledAddress=""
        branches={branchOptions}
        branchesLoading={branchesLoading}
        defaultBranchId={isBranchManager ? branchIdFromMeta : undefined}
        lockBranch={!!(isBranchManager && branchIdFromMeta)}
        staffMembers={clientStaff.map((s) => ({ id: s.id, name: s.name, role: s.role, branch_id: s.branch_id }))}
        staffLoading={staffLoading}
        onSave={async (data) => {
          if (!data) return;
          if (!agencyId) {
            alert('No agency selected for this user.');
            return;
          }
          await createMovementFromForm(agencyId, 'valuation', data, loadMovements, resolvedClientId);
          setValuationFormOpen(false);
        }}
      />
    </div>
  );
}
