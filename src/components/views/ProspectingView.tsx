import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDownIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, XIcon, FilterIcon, ChevronDownIcon, ClockIcon, Building2Icon, TrendingUpIcon, SlidersHorizontalIcon, CheckCircle2Icon, MapIcon, ListIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDashboardStore, Prospect, ProspectingStatus } from '@/stores/dashboardStore';
import { ProspectStatusBadge } from '../ProspectStatusBadge';
import { ProspectStatusSelect } from '../ProspectStatusSelect';
import { DateRangePicker } from '../DateRangePicker';
import { BranchSelect } from '../BranchSelect';
import { AddProspectDialog } from '../AddProspectDialog';
import { AddPropertyDialog, type AddPropertyFormData } from '../AddPropertyDialog';
import { ProspectingSummaryCards } from '../ProspectingSummaryCards';
import { ProspectDetailViewFull } from '../ProspectDetailViewFull';
import { ProspectingMapView } from '../ProspectingMapView';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';
import { createMovement, resolveClientIdForUser, updateProspect, type MovementInput } from '@/lib/dashboardApi';
import { createDiaryEvent as createDiaryEventRow } from '@/lib/diaryApi';
import { fetchClientBranches, fetchClientBranchesForAgency, fetchClientStaffForClient, fetchClientStaffForAgency, ClientStaffRow } from '@/lib/ownerApi';
import { buildAppointmentDateTime } from '@/lib/appointmentDateTime';
import { appendProspectStatusHistory, encodeProspectNotes } from '@/lib/prospectNotes';
import { notifyError } from '@/lib/notify';

const TEAM_MEMBER_LABELS: Record<string, string> = {
  sarah: 'Sarah Johnson',
  michael: 'Michael Brown',
  emma: 'Emma Wilson',
  david: 'David Lee',
};

const PROSPECTING_ACQUISITION_CHANNEL = 'Prospector';

const parseNumber = (value: string): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};
const getMovementStageLabel = (status?: string): string => {
  if (!status) return 'Valuation';
  switch (status) {
    case 'valuation':
      return 'Valuation';
    case 'on-books':
      return 'On Books';
    case 'offer':
      return 'Offer';
    case 'sale':
      return 'Sale';
    case 'exchanged':
      return 'Exchanged';
    case 'completed':
      return 'Completed';
    default:
      return status
        .split('-')
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join(' ');
  }
};
type SortField = 'date' | 'address' | 'priceEst' | 'branch' | 'stage';
type SortDirection = 'asc' | 'desc';

interface ProspectingViewProps {
  agencyId?: string;
  branchId?: string;
}

export function ProspectingView({ agencyId: agencyIdProp, branchId: branchIdProp }: ProspectingViewProps = {}) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const userRole = getUserRole(user);
  const isBranchManagerUser = userRole === 'branch_manager';
  const branchIdFromMeta = (user?.user_metadata as any)?.branch_id as string | undefined;

  const {
    agencyId: storeAgencyId,
    prospects,
    filteredProspects,
    staffMembers,
    updateProspectStatus,
    searchQuery,
    setSearchQuery,
    dateRange,
    compareDateRange,
    isComparingDates,
    selectedBranch,
    selectedProspectingStatus,
    clearFilters,
    loadMovements,
    loadProspects,
    loadStaffMembers,
  } = useDashboardStore();

  const effectiveAgencyId = agencyIdProp ?? storeAgencyId;
  const effectiveBranchId = branchIdProp ?? branchIdFromMeta;

  const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [clientStaffList, setClientStaffList] = useState<ClientStaffRow[]>([]);

  useEffect(() => {
    if (!user) {
      setResolvedClientId(null);
      return;
    }

    const metaClientId =
      (user.user_metadata as any)?.client_id ?? (user.app_metadata as any)?.client_id ?? null;
    if (metaClientId) {
      setResolvedClientId(metaClientId as string);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const resolved = await resolveClientIdForUser(user);
      if (!cancelled) setResolvedClientId(resolved);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  // Load staff members when agencyId is available
  useEffect(() => {
    if (effectiveAgencyId) {
      loadStaffMembers(effectiveAgencyId);
    }
  }, [effectiveAgencyId, loadStaffMembers]);

  // Load client staff for team member dropdown
  useEffect(() => {
    const loadClientStaff = async () => {
      if (resolvedClientId) {
        const staff = await fetchClientStaffForClient(resolvedClientId);
        setClientStaffList(staff);
        return;
      }
      if (effectiveAgencyId) {
        const staff = await fetchClientStaffForAgency(effectiveAgencyId);
        setClientStaffList(staff);
      }
    };
    void loadClientStaff();
  }, [resolvedClientId, effectiveAgencyId]);

  useEffect(() => {
    const loadBranches = async () => {
      if (resolvedClientId) {
        setBranchesLoading(true);
        const rows = await fetchClientBranches(resolvedClientId);
        let options = rows.map((b) => ({ id: b.id, name: b.name }));
        if (isBranchManagerUser && effectiveBranchId) {
          const match = options.find((b) => b.id === effectiveBranchId);
          options = match ? [match] : [];
        }
        setBranchOptions(options);
        setBranchesLoading(false);
        return;
      }

      if (effectiveAgencyId) {
        setBranchesLoading(true);
        const rows = await fetchClientBranchesForAgency(effectiveAgencyId);
        let options = rows.map((b) => ({ id: b.id, name: b.name }));
        if (isBranchManagerUser && effectiveBranchId) {
          const match = options.find((b) => b.id === effectiveBranchId);
          options = match ? [match] : [];
        }
        setBranchOptions(options);
        setBranchesLoading(false);
        return;
      }

      setBranchOptions([]);
    };

    void loadBranches();
  }, [resolvedClientId, effectiveAgencyId, isBranchManagerUser, effectiveBranchId]);

  const [searchOpen, setSearchOpen] = useState(true);
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [confirmMoveOpen, setConfirmMoveOpen] = useState(false);
  const [prospectToMove, setProspectToMove] = useState<Prospect | null>(null);
  const [showValuationForm, setShowValuationForm] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const selectedProspect = useMemo(
    () => prospects.find((p) => p.id === selectedProspectId) ?? null,
    [prospects, selectedProspectId]
  );
  const [displayCount, setDisplayCount] = useState(12);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProspects = React.useMemo(() => {
    return [...filteredProspects].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'address':
          comparison = a.address.localeCompare(b.address);
          break;
        case 'priceEst':
          comparison = a.priceEst - b.priceEst;
          break;
        case 'branch':
          comparison = a.branch.localeCompare(b.branch);
          break;
        case 'stage':
          comparison = a.stage.localeCompare(b.stage);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredProspects, sortField, sortDirection]);

  const displayedProspects = React.useMemo(() => {
    return sortedProspects.slice(0, displayCount);
  }, [sortedProspects, displayCount]);

  const hasMore = sortedProspects.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 12);
  };

  const hasActiveFilters = 
    searchQuery !== '' ||
    dateRange.from || 
    dateRange.to || 
    (isComparingDates && (compareDateRange.from || compareDateRange.to)) ||
    selectedBranch !== 'all' ||
    selectedProspectingStatus !== 'all';

  const handleMoveToMovements = (prospectId: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (prospect) {
      setProspectToMove(prospect);
      setConfirmMoveOpen(true);
    }
  };

  const handleProspectStatusChange = (prospectId: string, newStatus: ProspectingStatus) => {
    const prospect = prospects.find((item) => item.id === prospectId);
    if (!prospect) return;

    if (newStatus === 'valuation' && prospect.stage !== 'valuation' && !prospect.movementBooked) {
      handleMoveToMovements(prospectId);
      return;
    }

    void updateProspectStatus(prospectId, newStatus);
  };

  const confirmMoveToMovements = () => {
    setConfirmMoveOpen(false);
    setShowValuationForm(true);
  };

  const handleValuationFormClose = () => {
    setShowValuationForm(false);
    setProspectToMove(null);
  };

  const handleValuationFormSave = async (formData?: AddPropertyFormData) => {
    if (!prospectToMove || !effectiveAgencyId) {
      setShowValuationForm(false);
      setProspectToMove(null);
      return;
    }

    try {
      // Parse price from form data
      const parsePrice = (priceStr: string | undefined): number => {
        if (!priceStr) return prospectToMove.priceEst || 0;
        const cleaned = priceStr.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || prospectToMove.priceEst || 0;
      };

      // Parse fee values
      const parseFee = (feeStr: string | undefined): number | undefined => {
        if (!feeStr) return undefined;
        const cleaned = feeStr.replace(/[^0-9.]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? undefined : val;
      };

      // Prepare movement input
      const normalizedProspectNotes = prospectToMove.notes?.trim() || '';
      const acquisitionChannelNote = `Acquisition Channel: ${PROSPECTING_ACQUISITION_CHANNEL}`;
      const movementNotes = [normalizedProspectNotes, acquisitionChannelNote]
        .filter(Boolean)
        .join('\n')
        .trim();

      const movementInput: MovementInput = {
        branch_id: formData?.branch || undefined,
        property: formData?.description || prospectToMove.address,
        address: formData?.address || prospectToMove.address,
        type: formData?.salesOrLettings === 'lettings' ? 'letting' : 'sale',
        status: 'valuation',
        price: parsePrice(formData?.price),
        fee_amount: parseFee(formData?.feeAmount),
        fee_percentage: parseFee(formData?.feePercentage),
        date: formData?.appointmentDate || new Date().toISOString().slice(0, 10),
        agent: formData?.teamMember || prospectToMove.prospector,
        board: false,
        notes: movementNotes || undefined,
        motivated_seller: formData?.motivatedSeller || undefined,
      };

      // Create actual movement in database
      const createdMovement = await createMovement(effectiveAgencyId, movementInput, resolvedClientId || undefined);

      if (!createdMovement) {
        notifyError('Failed to create movement. Please try again.');
        return;
      }

      // Keep valuation appointments in diary/calendar at selected date and time.
      const appointmentDate = formData?.appointmentDate || movementInput.date;
      if (appointmentDate) {
        const startAt = buildAppointmentDateTime(appointmentDate, formData?.appointmentTime);
        if (startAt) {
          const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
          try {
            await createDiaryEventRow({
              agency_id: effectiveAgencyId,
              client_id: resolvedClientId || null,
              branch_id: formData?.branch || effectiveBranchId || null,
              staff_id: formData?.teamMember || null,
              title: 'Valuation',
              description: formData?.description || prospectToMove.address || null,
              category: 'valuation',
              start_at: startAt.toISOString(),
              end_at: endAt.toISOString(),
              all_day: false,
              location: formData?.address || prospectToMove.address || null,
              vendor_name: formData?.vendorName || null,
              property_address: formData?.address || prospectToMove.address || null,
              created_by: user?.id ?? null,
            });
          } catch (diaryError) {
            console.error('Error creating diary entry for valuation movement:', diaryError);
          }
        } else {
          console.warn('Skipping valuation diary event due to invalid appointment date/time', {
            appointmentDate,
            appointmentTime: formData?.appointmentTime,
          });
        }
      }

      const nextStatusHistory = appendProspectStatusHistory(
        prospectToMove.statusHistory,
        'valuation',
        prospectToMove.prospector
      );

      // Update prospect in database to mark as booked and link to movement
      await updateProspect(prospectToMove.id, {
        movement_booked: true,
        linked_movement_id: createdMovement.id,
        stage: 'valuation', // Update stage to valuation when booked
        notes: encodeProspectNotes(
          prospectToMove.notes,
          prospectToMove.agent,
          prospectToMove.photos,
          prospectToMove.noteHistory,
          nextStatusHistory
        ),
      });

      // Update local state
      const { bookProspectMovement } = useDashboardStore.getState();
      bookProspectMovement(prospectToMove.id, createdMovement.id);

      // Refresh data from database
      if (effectiveAgencyId) {
        await loadMovements(effectiveAgencyId, resolvedClientId || undefined);
        await loadProspects(effectiveAgencyId, resolvedClientId || undefined);
      }

      console.log('Prospect successfully moved to movements:', {
        prospectId: prospectToMove.id,
        movementId: createdMovement.id,
        status: 'valuation',
        address: prospectToMove.address,
      });

      setShowValuationForm(false);
      setProspectToMove(null);
    } catch (error) {
      console.error('Error creating movement from prospect:', error);
      notifyError('An error occurred while creating the movement. Please try again.');
    }
  };

  if (displayedProspects.length === 0) {
    return (
      <TooltipProvider>
        <div className={cn("space-y-4 relative z-10", isMobile ? "p-4" : "p-6 md:p-8")}>
          {/* Summary Cards */}
          <ProspectingSummaryCards />
          
          {/* Filters Row */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker />
              <ProspectStatusSelect />
              <BranchSelect />
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddProspectOpen(true)}>
                <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Add Prospect
              </Button>
            </div>
          </div>
          
          {/* Empty State */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
            <img
              src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_2.png"
              alt="empty state illustration"
              className="mb-6 h-48 w-auto object-contain"
              loading="lazy"
            />
            <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
              No prospects found
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first prospect'
              }
            </p>
            {!hasActiveFilters && (
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setAddProspectOpen(true)}
              >
                <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Add Your First Prospect
              </Button>
            )}
          </div>
          
          <AddProspectDialog open={addProspectOpen} onOpenChange={setAddProspectOpen} />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      {selectedProspect && (
        <ProspectDetailViewFull 
          prospect={selectedProspect} 
          onClose={() => setSelectedProspectId(null)}
          onStatusChange={handleProspectStatusChange}
        />
      )}
      
      <div className={cn("space-y-4 relative z-10", isMobile ? "p-4" : "p-6 md:p-8")}>
        {/* Summary Cards */}
        <ProspectingSummaryCards />

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
          {isMobile ? (
            <>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
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
                          placeholder="Quick search prospects..."
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
                  onClick={() => setAddProspectOpen(true)}
                >
                  <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  Add Prospect
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
                  <SheetContent side="bottom" className="h-auto max-h-[80vh] bg-card">
                    <SheetHeader className="flex flex-row items-center justify-between px-4 pt-4">
                      <SheetTitle className="text-foreground text-xl">Filter Prospects</SheetTitle>
                      <Button variant="ghost" size="icon" onClick={() => setFilterSheetOpen(false)}>
                        <XIcon className="h-5 w-5" strokeWidth={1.5} />
                      </Button>
                    </SheetHeader>
                    <div className="flex flex-col gap-4 p-4">
                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="item-date-range" className="border-b border-border">
                          <AccordionTrigger className="flex items-center gap-2 py-3 text-sm font-medium text-foreground hover:no-underline">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            Date Range
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-2">
                            <DateRangePicker />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-branch" className="border-b border-border">
                          <AccordionTrigger className="flex items-center gap-2 py-3 text-sm font-medium text-foreground hover:no-underline">
                            <Building2Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            Branch
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-2">
                            <BranchSelect />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-stage" className="border-b border-border">
                          <AccordionTrigger className="flex items-center gap-2 py-3 text-sm font-medium text-foreground hover:no-underline">
                            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            Stage
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-2">
                            <ProspectStatusSelect />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { clearFilters(); setFilterSheetOpen(false); }}
                          className="bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive-foreground mb-2 w-full"
                        >
                          <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Clear Filters
                        </Button>
                      )}
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setFilterSheetOpen(false)}>
                        Apply Filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <DateRangePicker />
                <ProspectStatusSelect />
                <BranchSelect />
                
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Clear Filters
                  </Button>
                )}
              </div>

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

                {searchOpen ? (
                  <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Search prospects..."
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

                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddProspectOpen(true)}>
                  <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  Add Prospect
                </Button>
              </div>
            </>
          )}
        </div>

        {viewMode === 'map' ? (
          <div className="animate-in fade-in-50 duration-300">
            <ProspectingMapView />
          </div>
        ) : (
          <Card className="rounded-lg border border-border bg-card">
          {isMobile ? (
            <div className="flex flex-col gap-3 p-3">
              {displayedProspects.map((prospect) => (
                <Card
                  key={prospect.id}
                  className={cn(
                    'cursor-pointer transition-colors duration-150 hover:shadow-lg',
                    prospect.movementBooked && prospect.linkedMovementStatus
                      ? prospect.linkedMovementStatus === 'valuation'
                        ? "bg-orange-100 dark:bg-orange-950/40 border-l-4 border-l-orange-500"
                        : prospect.linkedMovementStatus === 'on-books'
                        ? "bg-yellow-100 dark:bg-yellow-950/40 border-l-4 border-l-yellow-500"
                        : prospect.linkedMovementStatus === 'offer'
                        ? "bg-blue-100 dark:bg-blue-950/40 border-l-4 border-l-blue-500"
                        : prospect.linkedMovementStatus === 'sale'
                        ? "bg-red-100 dark:bg-red-950/40 border-l-4 border-l-red-500"
                        : "bg-green-100 dark:bg-green-950/40 border-l-4 border-l-green-500"
                      : "bg-card text-card-foreground"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-start mb-2">
                      <p className="text-base font-medium text-foreground line-clamp-2">
                          {prospect.address}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          £{prospect.priceEst.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      <span>
                        {new Date(prospect.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {prospect.movementBooked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2Icon className="h-3 w-3" strokeWidth={2} />
                          Booked ({getMovementStageLabel(prospect.linkedMovementStatus)})
                        </span>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-3 text-xs"
                          onClick={() => handleMoveToMovements(prospect.id)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                    <div className="mt-2">
                      <ProspectStatusBadge
                        status={prospect.stage}
                        prospectId={prospect.id}
                        onStatusChange={handleProspectStatusChange}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-foreground text-center">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('date')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Date
                        {sortField === 'date' && (
                          <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('stage')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Stage
                        {sortField === 'stage' && (
                          <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('address')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Address
                        {sortField === 'address' && (
                          <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground">Prospector</TableHead>
                    <TableHead className="text-foreground">Notes</TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('priceEst')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Price Est.
                        {sortField === 'priceEst' && (
                          <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('branch')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Branch
                        {sortField === 'branch' && (
                          <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-foreground">Type</TableHead>
                    <TableHead className="text-foreground">Hot/Cold</TableHead>
                    <TableHead className="text-foreground">Current Agent</TableHead>
                    <TableHead className="text-right text-foreground">Last Canvassed</TableHead>
                    <TableHead className="text-right text-foreground">Movement Book</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProspects.map((prospect) => (
                    <TableRow 
                      key={prospect.id}
                      onClick={() => setSelectedProspectId(prospect.id)}
                      className={cn(
                        "transition-colors duration-150 cursor-pointer",
                        prospect.movementBooked && prospect.linkedMovementStatus
                          ? prospect.linkedMovementStatus === 'valuation' 
                            ? "bg-orange-100 dark:bg-orange-950/40 hover:bg-orange-200 dark:hover:bg-orange-950/50"
                            : prospect.linkedMovementStatus === 'on-books'
                            ? "bg-yellow-100 dark:bg-yellow-950/40 hover:bg-yellow-200 dark:hover:bg-yellow-950/50"
                            : prospect.linkedMovementStatus === 'offer'
                            ? "bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 dark:hover:bg-blue-950/50"
                            : prospect.linkedMovementStatus === 'sale'
                            ? "bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-950/50"
                            : "bg-green-100 dark:bg-green-950/40 hover:bg-green-200 dark:hover:bg-green-950/50"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <TableCell className="text-muted-foreground">
                        {new Date(prospect.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {prospect.movementBooked && prospect.linkedMovementStatus ? (
                        <div className="inline-flex items-center justify-center relative rounded-md px-3 py-1 text-xs font-medium w-[130px] shadow-sm bg-orange-500 text-white">
                          <span className="text-center truncate px-2">
                            {getMovementStageLabel(prospect.linkedMovementStatus)}
                          </span>
                        </div>
                      ) : (
                        <ProspectStatusBadge 
                          status={prospect.stage} 
                          prospectId={prospect.id}
                          onStatusChange={handleProspectStatusChange}
                        />
                      )}
                    </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {prospect.address}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{prospect.prospector}</TableCell>
                      <TableCell className="text-foreground">
                        {prospect.notes && prospect.notes !== 'No Notes to Display' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-help transition-colors bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                <div className="h-1.5 w-1.5 rounded-full animate-pulse bg-blue-500" />
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">View</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="max-w-[400px] bg-popover text-popover-foreground border border-border shadow-lg p-4"
                            >
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-foreground">Prospect Notes</p>
                                <p className="text-sm whitespace-normal leading-relaxed">{prospect.notes}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-foreground">£{prospect.priceEst.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{prospect.branch}</TableCell>
                      <TableCell className="text-foreground capitalize">{prospect.type.replace('-', ' ')}</TableCell>
                      <TableCell className="text-foreground capitalize">{prospect.hotCold.replace('-', ' ')}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {prospect.agent || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {(() => {
                        const prospectDate = new Date(prospect.date);
                        const today = new Date();
                        const daysDiff = Math.floor((today.getTime() - prospectDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (daysDiff === 0) {
                          return <span className="text-green-600 font-semibold">Today</span>;
                        } else if (daysDiff === 1) {
                          return <span className="text-green-600 font-semibold">1 day</span>;
                        } else if (daysDiff <= 7) {
                          return <span className="text-green-600 font-semibold">{daysDiff} days</span>;
                        } else if (daysDiff <= 14) {
                          return <span className="text-orange-600 font-semibold">{daysDiff} days</span>;
                        } else {
                          return <span className="text-red-600 font-semibold">{daysDiff} days</span>;
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {prospect.movementBooked ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2Icon className="h-3 w-3" strokeWidth={2} />
                            Booked ({getMovementStageLabel(prospect.linkedMovementStatus)})
                          </span>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToMovements(prospect.id);
                          }}
                        >
                          Add
                        </Button>
                      )}
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {hasMore && (
            <div className="flex justify-center p-4 border-t border-border">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              >
                Load More
              </Button>
            </div>
          )}
          </Card>
        )}
        
        <AddProspectDialog open={addProspectOpen} onOpenChange={setAddProspectOpen} />

        <AddPropertyDialog
          open={showValuationForm}
          onOpenChange={handleValuationFormClose}
          preselectedStatus="valuation"
          prefilledAddress={prospectToMove?.address}
          prefilledTeamMember={prospectToMove?.prospector}
          defaultAcquisitionChannel={PROSPECTING_ACQUISITION_CHANNEL}
          lockAcquisitionChannel
          onSave={handleValuationFormSave}
          branches={branchOptions}
          branchesLoading={branchesLoading}
          defaultBranchId={effectiveBranchId}
          lockBranch={isBranchManagerUser}
          staffMembers={clientStaffList.map(s => ({
            id: s.id,
            name: s.name,
            role: s.role,
            branch: branchOptions.find(b => b.id === s.branch_id)?.name,
            branch_id: s.branch_id,
          }))}
        />

        <AlertDialog open={confirmMoveOpen} onOpenChange={setConfirmMoveOpen}>
          <AlertDialogContent className="bg-card text-card-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Move to Movements</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will create a new Valuation entry in Movements for this prospect. The prospect will be marked as booked. Do you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-accent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmMoveToMovements}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm & Add to Movements
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
