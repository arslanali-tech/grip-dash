import { create } from 'zustand';
import { fetchMovements, fetchProspects, updateMovement, updateMovementsNotesForAddress, updateProspect, createMovementWithNewStatus, addMovementStatusHistoryEntry } from '@/lib/dashboardApi';
import { createDiaryEvent as createDiaryEventRow } from '@/lib/diaryApi';
import { fetchClientBranches, fetchClientStaffForClient, fetchStaffMembers, ClientStaffRow, StaffMemberRow, type FranchiseClientSummary } from '@/lib/ownerApi';
import { DashboardModuleId } from '@/lib/dashboardModules';
import { appendProspectStatusHistory, decodeProspectNotes, encodeProspectNotes } from '@/lib/prospectNotes';
import { normalizeViewingArrangement, type ViewingArrangement } from '@/lib/viewingArrangements';

export type ViewType = 'overview' | 'movements' | 'prospecting' | 'business-analytics' | 'business-manager' | 'branch-league-table' | 'staff' | 'branches' | 'buyers-sellers' | 'tasks' | 'team-chat' | 'grip-dash' | 'genius' | 'genius-performance-calculator' | 'genius-calendar' | 'genius-kpis' | 'genius-staff-kpis' | 'genius-branch-kpis' | 'settings' | 'data-upload' | 'lead-gen-upload' | 'general-settings' | 'genius-weekly-snapshot' | 'genius-branch-performance-summary' | 'genius-staff-performance-summary' | 'genius-set-targets' | 'base-camp' | 'prospector-dash' | 'stationery-request' | 'invoice-generator' | 'invoice-template' | 'compliance-documents' | 'compliance-tasks-list' | 'house-keeping' | 'my-analytics' | 'prospecting-analytics' | 'role-configuration' | 'module-configuration';
export type MovementTab = 'all' | 'sales' | 'lettings';

export interface CommissionItem {
  id: string;
  label: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  branch: string;
  email: string;
  phone: string;
  avatar: string;
  activeListings: number;
  completedDeals: number;
  totalRevenue: number;
  status: 'active' | 'away' | 'offline';
  basicWage?: number;
  employerNICs?: number;
  employerPension?: number;
  commissionBreakdown?: {
    sales: CommissionItem[];
    lettings: CommissionItem[];
  };
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}
export type MovementStatus = 
  | 'offer' 
  | 'let-offer' 
  | 'on-books' 
  | 'abort' 
  | 'aml-referral' 
  | 'back-on' 
  | 'completed' 
  | 'exchanged' 
  | 'legal-referral' 
  | 'legal-signup' 
  | 'mortgage-referral' 
  | 'mortgage-signup' 
  | 'on-books-status' 
  | 'price-change' 
  | 'sale' 
  | 'valuation' 
  | 'valuation-referral' 
  | 'withdrawn-sales' 
  | 'let' 
  | 'back-on-let' 
  | 'withdrawn';

export type ProspectingStatus = 
  | 'canvassed' 
  | 'not-available' 
  | 'opportunities' 
  | 'potential-seller' 
  | 'sold-oa' 
  | 'valuation';

export interface MovementNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface PropertyOffer {
  id: string;
  amount: number;
  buyer: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  submittedDate: string;
  notes?: string;
}

export interface Movement {
  id: string;
  property: string;
  address: string;
  type: 'sale' | 'letting';
  status: MovementStatus;
  price: number;
  feeAmount?: number;
  feePercentage?: number;
  date: string;
  createdAt: string;
  agent: string;
  board?: boolean;
  viewingArrangement?: ViewingArrangement;
  viewingNotes?: string;
  branch: string;
  notes?: string;
  noteHistory?: MovementNote[];
  offers?: PropertyOffer[];
  motivatedSeller?: 'red' | 'yellow' | 'green';
  hasNewNote?: boolean; // Flag to indicate if there's a new unread note
}

export interface Prospect {
  id: string;
  date: string;
  stage: ProspectingStatus;
  address: string;
  prospector: string;
  notes: string;
  priceEst: number;
  branch: string;
  type: 'for-sale' | 'to-let';
  hotCold: 'hot' | 'cold' | 'incomplete';
  movementBooked: boolean;
  linkedMovementId?: string;
  linkedMovementStatus?: MovementStatus;
  agent?: string;
  photos?: string[];
  noteHistory?: Array<{ content: string; createdBy?: string; createdAt?: string }>;
  statusHistory?: Array<{ status: string; changedBy?: string; changedAt?: string }>;
}

interface DashboardState {
  currentView: ViewType;
  currentTab: MovementTab;
  agencyId: string | null;
  clientId: string | null;
  clientScopeIds: string[] | null;
  franchiseClients: FranchiseClientSummary[];
  userEnabledModules: DashboardModuleId[] | null; // User-specific enabled modules from DB
  movements: Movement[];
  filteredMovements: Movement[];
  prospects: Prospect[]; // New state for prospects
  filteredProspects: Prospect[]; // New state for filtered prospects
  staffMembers: StaffMember[]; // New state for staff members
  loadingMovements: boolean;
  loadingProspects: boolean;
  error: string | null;
  searchQuery: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
  compareDateRange: { from: Date | undefined; to: Date | undefined };
  isComparingDates: boolean;
  selectedMovementType: string;
  selectedBranch: string;
  selectedStatus: string;
  selectedProspectingStatus: string; // New state for prospecting status filter
  viewMode: 'list' | 'map'; // New state for view mode
  setCurrentView: (view: ViewType) => void;
  setCurrentTab: (tab: MovementTab) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  setCompareDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  setIsComparingDates: (isComparing: boolean) => void;
  setSelectedMovementType: (type: string) => void;
  setSelectedBranch: (branch: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedProspectingStatus: (status: string) => void; // New action
  setViewMode: (mode: 'list' | 'map') => void; // New action
  clearFilters: () => void;
  filterMovements: () => void;
  filterProspects: () => void; // New action
  setAgencyId: (id: string | null) => void;
  setClientId: (id: string | null) => void;
  setClientScopeIds: (ids: string[] | null) => void;
  setFranchiseClients: (clients: FranchiseClientSummary[]) => void;
  loadMovements: (agencyId: string, clientId?: string | string[]) => Promise<void>;
  loadProspects: (agencyId: string, clientId?: string | string[]) => Promise<void>;
  loadStaffMembers: (agencyId: string, clientId?: string | string[]) => Promise<void>;
  setFranchiseContext: (context: { clientId?: string | null; clientScopeIds?: string[] | null; franchiseClients?: FranchiseClientSummary[] | null }) => void;
  updateMovementStatus: (movementId: string, newStatus: MovementStatus, ...details: unknown[]) => Promise<void>;
  updateProspectStatus: (prospectId: string, newStatus: ProspectingStatus) => Promise<void>; // New action
  bookProspectMovement: (prospectId: string, movementId: string) => void;
  updateLinkedProspectStatus: (movementId: string, newStatus: MovementStatus) => void;
  updateStaffMember: (updatedStaff: StaffMember) => void; // New action
  setUserEnabledModules: (modules: DashboardModuleId[] | null) => void; // Set user-specific modules
}

const mockMovements: Movement[] = [];
const mockProspects: Prospect[] = [];

const initialStaffMembers: StaffMember[] = [];

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const mapMovementRowToMovement = (row: any): Movement => {
  // Prefer a human-friendly branch name from related branch tables when available.
  const branchName =
    (row.client_branches as any)?.name ??
    (row.branches as any)?.name ??
    row.branch_id ??
    'Unassigned';

  const offers = Array.isArray(row.movement_offers)
    ? row.movement_offers
        .map((offer: any) => ({
          id: offer.id,
          amount: Number(offer.amount ?? 0),
          buyer: offer.buyer ?? '',
          status: (offer.status as PropertyOffer['status']) ?? 'pending',
          submittedDate: offer.submitted_date ?? offer.created_at ?? new Date().toISOString(),
          notes: offer.notes ?? undefined,
        }))
        .sort((a: PropertyOffer, b: PropertyOffer) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime())
    : undefined;
  return {
    id: row.id,
    property: row.property ?? '',
    address: row.address ?? '',
    type: (row.type as Movement['type']) ?? 'sale',
    status: (row.status as MovementStatus) ?? 'on-books',
    price: toNumber(row.price ?? 0),
    feeAmount: toNumber(row.fee_amount ?? 0) || undefined,
    feePercentage: toNumber(row.fee_percentage ?? 0) || undefined,
    date: row.date ?? '',
    createdAt: row.created_at ?? '',
    agent: row.agent ?? '',
    board: row.board ?? false,
    viewingArrangement: normalizeViewingArrangement(row.viewing_arrangements),
    viewingNotes:
      typeof row.viewing_notes === 'string' && row.viewing_notes.trim().length > 0
        ? row.viewing_notes.trim()
        : undefined,
    branch: branchName,
    notes: row.notes ?? undefined,
    offers,
    motivatedSeller: (row.motivated_seller as any) ?? undefined,
  };
};

const normalizeMovementKeyPart = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const movementNotesGroupKey = (movement: Pick<Movement, 'address' | 'property' | 'type'>): string => {
  const address = normalizeMovementKeyPart(movement.address);
  const property = normalizeMovementKeyPart(movement.property);
  const type = normalizeMovementKeyPart(movement.type);
  if (!address && !property) return '';
  return `${address}|${property}|${type}`;
};

const toTimestamp = (primary?: string, fallback?: string): number => {
  const primaryTs = primary ? new Date(primary).getTime() : NaN;
  if (Number.isFinite(primaryTs)) return primaryTs;
  const fallbackTs = fallback ? new Date(fallback).getTime() : NaN;
  return Number.isFinite(fallbackTs) ? fallbackTs : 0;
};

const resolveSharedMovementNotes = (movements: Movement[]): Movement[] => {
  const latestNoteByGroup = new Map<string, { note: string; rank: number }>();

  for (const movement of movements) {
    const groupKey = movementNotesGroupKey(movement);
    const note = movement.notes?.trim();
    if (!groupKey || !note) continue;

    const rank = toTimestamp(movement.createdAt, movement.date);
    const previous = latestNoteByGroup.get(groupKey);
    if (!previous || rank >= previous.rank) {
      latestNoteByGroup.set(groupKey, { note, rank });
    }
  }

  return movements.map((movement) => {
    const groupKey = movementNotesGroupKey(movement);
    if (!groupKey) return movement;

    const sharedNote = latestNoteByGroup.get(groupKey)?.note;
    if (!sharedNote) return movement;
    if ((movement.notes ?? '').trim() === sharedNote) return movement;

    return { ...movement, notes: sharedNote };
  });
};

const mapStaffRowToStaffMember = (row: StaffMemberRow): StaffMember => ({
  id: row.id,
  name: row.name,
  role: row.role,
  branch: row.branch_name ?? 'Unassigned',
  email: row.email,
  phone: row.phone ?? '',
  avatar: row.avatar_url ?? 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
  activeListings: 0,
  completedDeals: 0,
  totalRevenue: 0,
  status: (row.status as StaffMember['status']) ?? 'offline',
  basicWage: row.basic_wage ?? undefined,
  employerNICs: row.employer_nics ?? undefined,
  employerPension: row.employer_pension ?? undefined,
  commissionBreakdown: row.commission_breakdown ?? undefined,
});
const normalizeProspectStage = (stage: unknown): ProspectingStatus => {
  const normalized = typeof stage === 'string' ? stage.trim().toLowerCase() : '';
  if (normalized === 'valuation' || normalized === 'valpal') return 'valuation';
  if (normalized === 'canvassed') return 'canvassed';
  if (normalized === 'not-available') return 'not-available';
  if (normalized === 'opportunities') return 'opportunities';
  if (normalized === 'potential-seller') return 'potential-seller';
  if (normalized === 'sold-oa') return 'sold-oa';
  return 'canvassed';
};

const mapClientStaffRowToStaffMember = (
  row: ClientStaffRow,
  branchNameById: Map<string, string>
): StaffMember => ({
  id: row.id,
  name: row.name,
  role: row.role,
  branch: row.branch_id ? branchNameById.get(row.branch_id) ?? 'Unassigned' : 'Unassigned',
  email: row.email,
  phone: '',
  avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
  activeListings: 0,
  completedDeals: 0,
  totalRevenue: 0,
  status: 'active',
  basicWage: row.basic_wage ?? undefined,
  employerNICs: row.employer_nics ?? undefined,
  employerPension: row.employer_pension ?? undefined,
  commissionBreakdown: row.commission_breakdown ?? undefined,
});

const mapProspectRowToProspect = (row: any): Prospect => {
  const branchName = (row.client_branches as any)?.name ?? row.branch_id ?? 'Unassigned';
  const linkedStatus = (row.linked_movement_status as MovementStatus | null) ?? (row.movement_booked ? 'valuation' : null);
  const decoded = decodeProspectNotes(row.notes ?? '');
  const normalizedStage = normalizeProspectStage(row.stage);
  const rowAgent =
    (typeof row.agent === 'string' && row.agent.trim() ? row.agent.trim() : null) ??
    (typeof row.current_agent === 'string' && row.current_agent.trim() ? row.current_agent.trim() : null) ??
    null;
  const statusHistory =
    decoded.statusHistory && decoded.statusHistory.length > 0
      ? decoded.statusHistory
      : [
          {
            status: normalizedStage,
            changedAt: row.date ?? row.created_at ?? new Date().toISOString(),
            changedBy: row.prospector ?? undefined,
          },
        ];

  return {
    id: row.id,
    date: row.date ?? '',
    stage: normalizedStage,
    address: row.address ?? '',
    prospector: row.prospector ?? '',
    notes: decoded.notes,
    priceEst: Number(row.price_est ?? 0),
    branch: branchName,
    type: (row.type as Prospect['type']) ?? 'for-sale',
    hotCold: (row.hot_cold as Prospect['hotCold']) ?? 'hot',
    movementBooked: !!row.movement_booked,
    linkedMovementId: row.linked_movement_id ?? undefined,
    linkedMovementStatus: linkedStatus ?? undefined,
    agent: rowAgent ?? decoded.currentAgent ?? undefined,
    photos: decoded.photoDataUrls,
    noteHistory: decoded.noteEntries,
    statusHistory,
  };
};

const extractNotesFromStatusDetails = (details: unknown[]): string | undefined => {
  for (const detail of details) {
    if (!detail || typeof detail !== 'object') continue;
    const notes = (detail as { notes?: unknown }).notes;
    if (typeof notes === 'string' && notes.trim()) {
      return notes.trim();
    }
  }
  return undefined;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const extractPriceFromStatusDetails = (
  status: MovementStatus,
  details: unknown[]
): number | undefined => {
  const priceKeysByStatus: Partial<Record<MovementStatus, string[]>> = {
    'price-change': ['newPrice'],
    'back-on': ['price'],
    sale: ['agreedPrice'],
  };

  const candidateKeys = priceKeysByStatus[status] ?? [];
  if (candidateKeys.length === 0) return undefined;

  for (const detail of details) {
    if (!detail || typeof detail !== 'object') continue;
    const detailRecord = detail as Record<string, unknown>;
    for (const key of candidateKeys) {
      const parsed = parseOptionalNumber(detailRecord[key]);
      if (parsed !== undefined) return parsed;
    }
  }

  return undefined;
};

const normalizeFilterValue = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const parseDateSafe = (value: string | undefined): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Parse YYYY-MM-DD as local date to avoid timezone shifts in filters.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const localDate = new Date(year, month, day);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  currentView: 'movements',
  currentTab: 'all',
  agencyId: null,
  clientId: null,
  clientScopeIds: null,
  franchiseClients: [],
  userEnabledModules: null,
  movements: [],
  filteredMovements: [],
  prospects: [],
  filteredProspects: [],
  staffMembers: initialStaffMembers, // Initialize staff members
  loadingMovements: false,
  loadingProspects: false,
  error: null,
  searchQuery: '',
  dateRange: { from: undefined, to: undefined },
  compareDateRange: { from: undefined, to: undefined },
  isComparingDates: false,
  selectedMovementType: 'all',
  selectedBranch: 'all',
  selectedStatus: 'all',
  selectedProspectingStatus: 'all', // Initialize new filter state
  viewMode: 'list', // Default view mode
  
  setCurrentView: (view) => set({ currentView: view }),
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setCurrentTab: (tab) => {
    set({ currentTab: tab });
    get().filterMovements();
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().filterMovements();
    get().filterProspects(); // Also filter prospects
  },
  
  setDateRange: (range) => {
    set({ dateRange: range });
    get().filterMovements();
    get().filterProspects(); // Also filter prospects
  },

  setCompareDateRange: (range) => {
    set({ compareDateRange: range });
    get().filterMovements();
    get().filterProspects(); // Also filter prospects
  },

  setIsComparingDates: (isComparing) => {
    set({ isComparingDates: isComparing });
    if (!isComparing) {
      set({ compareDateRange: { from: undefined, to: undefined } });
    }
    get().filterMovements();
    get().filterProspects(); // Also filter prospects
  },
  
  setSelectedMovementType: (type) => {
    set({ selectedMovementType: type });
    get().filterMovements();
  },
  
  setSelectedBranch: (branch) => {
    set({ selectedBranch: branch });
    get().filterMovements();
    get().filterProspects(); // Also filter prospects
  },
  
  setSelectedStatus: (status) => {
    set({ selectedStatus: status });
    get().filterMovements();
  },

  setSelectedProspectingStatus: (status) => { // New action
    set({ selectedProspectingStatus: status });
    get().filterProspects();
  },

  setAgencyId: (id) => set({ agencyId: id }),
  setClientId: (id) => set({ clientId: id }),
  setClientScopeIds: (ids) => set({ clientScopeIds: ids }),
  setFranchiseClients: (clients) => set({ franchiseClients: clients }),
  setFranchiseContext: (context) => set({
    clientId: context.clientId ?? null,
    clientScopeIds: context.clientScopeIds ?? null,
    franchiseClients: context.franchiseClients ?? [],
  }),

  loadMovements: async (agencyId, clientId?) => {
    // Pass clientId to filter data for the specific client (data isolation)
    set({ loadingMovements: true, error: null, agencyId });
    // Use the current franchise scope when available, otherwise fall back to a single client id.
    const effectiveClientId = clientId ?? get().clientScopeIds ?? get().clientId ?? undefined;
    const rows = await fetchMovements(agencyId, effectiveClientId);
    const mapped = resolveSharedMovementNotes(rows.map(mapMovementRowToMovement));
    set({ movements: mapped, filteredMovements: mapped, loadingMovements: false });
    get().filterMovements();
  },

  loadProspects: async (agencyId, clientId?) => {
    // Pass clientId to filter data for the specific client (data isolation)
    set({ loadingProspects: true, error: null, agencyId });
    const effectiveClientId = clientId ?? get().clientScopeIds ?? get().clientId ?? undefined;
    const rows = await fetchProspects(agencyId, effectiveClientId);
    const mapped = rows.map(mapProspectRowToProspect);
    set({ prospects: mapped, filteredProspects: mapped, loadingProspects: false });
    get().filterProspects();
  },

  loadStaffMembers: async (agencyId, clientId?) => {
    const effectiveClientId = clientId ?? get().clientScopeIds ?? get().clientId ?? undefined;

    if (effectiveClientId) {
      const [staffRows, branchRows] = await Promise.all([
        fetchClientStaffForClient(effectiveClientId),
        fetchClientBranches(effectiveClientId),
      ]);
      const branchNameById = new Map(branchRows.map((b) => [b.id, b.name] as const));
      const mapped = staffRows.map((row) => mapClientStaffRowToStaffMember(row, branchNameById));
      set({ staffMembers: mapped.length > 0 ? mapped : initialStaffMembers });
      return;
    }

    const rows = await fetchStaffMembers(agencyId);
    const mapped = rows.map(mapStaffRowToStaffMember);
    set({ staffMembers: mapped.length > 0 ? mapped : initialStaffMembers });
  },
  
  clearFilters: () => {
    set({
      searchQuery: '',
      dateRange: { from: undefined, to: undefined },
      compareDateRange: { from: undefined, to: undefined },
      isComparingDates: false,
      selectedMovementType: 'all',
      selectedBranch: 'all',
      selectedStatus: 'all',
      selectedProspectingStatus: 'all', // Clear prospecting status filter
      currentTab: 'all'
    });
    get().filterMovements();
    get().filterProspects(); // Also clear and filter prospects
  },
  
  filterMovements: () => {
    const { movements, currentTab, searchQuery, dateRange, selectedMovementType, selectedBranch, selectedStatus } = get();
    
    let filtered = [...movements];
    
    // Filter by tab
    if (currentTab === 'sales') {
      filtered = filtered.filter(m => m.type === 'sale');
    } else if (currentTab === 'lettings') {
      filtered = filtered.filter(m => m.type === 'letting');
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.property.toLowerCase().includes(query) ||
        m.address.toLowerCase().includes(query) ||
        m.agent.toLowerCase().includes(query)
      );
    }
    
    // Filter by movement type
    if (selectedMovementType !== 'all') {
      filtered = filtered.filter(m => m.type === selectedMovementType);
    }
    
    // Filter by branch
    if (selectedBranch !== 'all') {
      const selectedBranchKey = normalizeFilterValue(selectedBranch);
      filtered = filtered.filter(m => normalizeFilterValue(m.branch) === selectedBranchKey);
    }
    
    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(m => m.status === selectedStatus);
    }
    
    // Filter by primary date range
    if (dateRange.from || dateRange.to) {
      const fromDate = dateRange.from ? new Date(dateRange.from) : undefined;
      const toDate = dateRange.to ? new Date(dateRange.to) : undefined;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(m => {
        const movementDate = parseDateSafe(m.date);
        if (!movementDate) return false;
        if (fromDate && movementDate < fromDate) return false;
        if (toDate && movementDate > toDate) return false;
        return true;
      });
    }
    
    set({ filteredMovements: filtered });
  },

  filterProspects: () => { // New filter logic for prospects
    const { prospects, searchQuery, dateRange, selectedBranch, selectedProspectingStatus } = get();

    let filtered = [...prospects];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.address.toLowerCase().includes(query) ||
        p.prospector.toLowerCase().includes(query) ||
        p.notes.toLowerCase().includes(query)
      );
    }

    // Filter by branch
    if (selectedBranch !== 'all') {
      const selectedBranchKey = normalizeFilterValue(selectedBranch);
      filtered = filtered.filter(p => normalizeFilterValue(p.branch) === selectedBranchKey);
    }

    // Filter by prospecting status
    if (selectedProspectingStatus !== 'all') {
      filtered = filtered.filter(p => p.stage === selectedProspectingStatus);
    }

    // Filter by date range (using primary date range for now)
    if (dateRange.from || dateRange.to) {
      const fromDate = dateRange.from ? new Date(dateRange.from) : undefined;
      const toDate = dateRange.to ? new Date(dateRange.to) : undefined;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(p => {
        const prospectDate = parseDateSafe(p.date);
        if (!prospectDate) return false;
        if (fromDate && prospectDate < fromDate) return false;
        if (toDate && prospectDate > toDate) return false;
        return true;
      });
    }

    set({ filteredProspects: filtered });
  },
  
  updateMovementStatus: async (movementId, newStatus, ...details) => {
    const { movements, agencyId, clientId } = get();
    const movement = movements.find((m) => m.id === movementId);

    if (!movement || !agencyId) return;
    if (movement.status === newStatus) return;

    const previousStatus = movement.status;
    const statusNotes = extractNotesFromStatusDetails(details);
    const statusPrice = extractPriceFromStatusDetails(newStatus, details);
    const movementOwnNote = movement.notes?.trim() || undefined;
    const movementKey = movementNotesGroupKey(movement);
    const propertySharedNote =
      movements.find(
        (m) =>
          m.id !== movementId &&
          movementNotesGroupKey(m) === movementKey &&
          typeof m.notes === 'string' &&
          m.notes.trim().length > 0
      )?.notes?.trim() || undefined;
    const propertyNoteToApply = statusNotes ?? movementOwnNote ?? propertySharedNote;

    try {
      if (propertyNoteToApply && movement.address) {
        await updateMovementsNotesForAddress(agencyId, movement.address, propertyNoteToApply, clientId ?? undefined);
      } else if (propertyNoteToApply) {
        await updateMovement(movementId, { notes: propertyNoteToApply });
      }

      // Record status change in history table
      await addMovementStatusHistoryEntry(movementId, previousStatus, newStatus, propertyNoteToApply);
      
      // Create a NEW movement row with the new status (keeps history in table)
      await createMovementWithNewStatus(
        movementId,
        newStatus,
        statusPrice !== undefined ? { price: statusPrice } : undefined
      );

      // When changing to valuation, also create a diary entry
      if (newStatus === 'valuation') {
        const now = new Date();
        const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
        const endAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
        try {
          await createDiaryEventRow({
            agency_id: agencyId,
            client_id: clientId ?? null,
            branch_id: null,
            staff_id: null,
            title: 'Valuation',
            description: movement.property || null,
            category: 'valuation',
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            all_day: false,
            location: movement.address || null,
            property_address: movement.address || null,
          });
        } catch (diaryError) {
          console.error('Error creating diary entry for valuation', diaryError);
        }
      }
      
      // Reload movements to show the new row in the table
      await get().loadMovements(agencyId, clientId ?? undefined);

      get().updateLinkedProspectStatus(movementId, newStatus);
    } catch (error) {
      console.error('Error creating movement with new status in Supabase', error);
    }
  },

  updateProspectStatus: async (prospectId, newStatus) => {
    const { prospects, agencyId } = get();
    const targetProspect = prospects.find((prospect) => prospect.id === prospectId);
    if (!targetProspect) return;
    if (targetProspect.stage === newStatus) return;

    const nextStatusHistory = appendProspectStatusHistory(
      targetProspect.statusHistory,
      newStatus,
      targetProspect.prospector
    );
    const encodedNotes = encodeProspectNotes(
      targetProspect.notes,
      targetProspect.agent,
      targetProspect.photos,
      targetProspect.noteHistory,
      nextStatusHistory
    );

    // Optimistically update local state
    const updatedProspects = prospects.map((p) =>
      p.id === prospectId ? { ...p, stage: newStatus, statusHistory: nextStatusHistory } : p
    );
    set({ prospects: updatedProspects });
    get().filterProspects();

    // Persist to Supabase (best-effort)
    try {
      const updated = await updateProspect(prospectId, { stage: newStatus, notes: encodedNotes });
      if (!updated && agencyId) {
        // If the update failed, refresh from source of truth.
        await get().loadProspects(agencyId);
      }
    } catch (error) {
      console.error('Error updating prospect status in Supabase', error);
      if (agencyId) {
        await get().loadProspects(agencyId);
      }
    }
  },

  bookProspectMovement: (prospectId: string, movementId: string) => {
    const { prospects } = get();
    const updatedProspects = prospects.map(p =>
      p.id === prospectId 
        ? { 
            ...p, 
            movementBooked: true, 
            linkedMovementId: movementId, 
            linkedMovementStatus: 'valuation' as MovementStatus,
            stage: 'valuation' as ProspectingStatus, // Update stage to valuation when booked
            statusHistory: appendProspectStatusHistory(
              p.statusHistory,
              'valuation',
              p.prospector
            ),
          }
        : p
    );
    set({ prospects: updatedProspects });
    get().filterProspects();
  },

  updateLinkedProspectStatus: (movementId: string, newStatus: MovementStatus) => {
    const { prospects } = get();
    const updatedProspects = prospects.map(p =>
      p.linkedMovementId === movementId
        ? { ...p, linkedMovementStatus: newStatus }
        : p
    );
    set({ prospects: updatedProspects });
    get().filterProspects();
  },

  updateStaffMember: (updatedStaff) => {
    const { staffMembers } = get();
    const updatedList = staffMembers.map(s => 
      s.id === updatedStaff.id ? updatedStaff : s
    );
    set({ staffMembers: updatedList });
  },

  setUserEnabledModules: (modules) => {
    set({ userEnabledModules: modules });
  },
}));

// Mock data for staff and branches (can be moved to a separate store if they grow)
export const mockStaffMembers: StaffMember[] = initialStaffMembers;

export const mockBranches: Branch[] = [
  { id: 'central-london', name: 'Central London', city: 'London' },
  { id: 'manchester-north', name: 'Manchester North', city: 'Manchester' },
  { id: 'birmingham-central', name: 'Birmingham Central', city: 'Birmingham' },
  { id: 'leeds-west', name: 'Leeds West', city: 'Leeds' },
  { id: 'bristol-harbourside', name: 'Bristol Harbourside', city: 'Bristol' },
  { id: 'liverpool-south', name: 'Liverpool South', city: 'Liverpool' },
];
