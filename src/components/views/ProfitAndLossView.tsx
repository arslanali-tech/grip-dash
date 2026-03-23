import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Settings,
  MoreHorizontal,
  Folder,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Save,
  Filter,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboardStore } from '@/stores/dashboardStore';
import { parseISO, getMonth, getYear, parse as parseWithPattern, isValid } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PnLSettingsDialog } from './PnLSettingsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ensureDefaultPnlStatement, fetchPnlStatement, upsertPnlStatement, fetchB2BReferrals, B2BReferralRow } from '@/lib/ownerApi';
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
import { useToast } from '@/hooks/use-toast';
import { exportElementToPdf } from '@/lib/exportPdf';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';

type Period = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

interface PnLRow {
  id: string;
  name: string;
  values: number[]; // Always stores 12 months of data
}

interface PnLSection {
  id: string;
  title: string;
  rows: PnLRow[];
  type: 'income' | 'cost';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const HALVES = ['H1', 'H2'];
const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const normalizeValuesTo12Months = (values: unknown): number[] => {
  if (!Array.isArray(values)) return Array(12).fill(0);
  return Array.from({ length: 12 }, (_, monthIndex) => toFiniteNumber(values[monthIndex]));
};
const normalizePnlSections = (incomingSections: PnLSection[]): PnLSection[] =>
  incomingSections.map((section) => ({
    ...section,
    rows: Array.isArray(section.rows)
      ? section.rows.map((row) => ({
          ...row,
          values: normalizeValuesTo12Months(row.values),
        }))
      : [],
  }));
const isAllZeroValues = (values: unknown) =>
  normalizeValuesTo12Months(values).every((value) => Math.abs(value) < 0.000001);
const MOVEMENT_DATE_PATTERNS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'd/M/yyyy', 'MM/dd/yyyy', 'M/d/yyyy', 'dd-MM-yyyy', 'd-M-yyyy'];

const parseMovementDate = (raw: string | null | undefined): Date | null => {
  if (!raw) return null;
  const input = raw.trim();
  if (!input) return null;

  const iso = parseISO(input);
  if (isValid(iso)) return iso;

  for (const pattern of MOVEMENT_DATE_PATTERNS) {
    const parsed = parseWithPattern(input, pattern, new Date());
    if (isValid(parsed)) return parsed;
  }

  const nativeDate = new Date(input);
  if (isValid(nativeDate)) return nativeDate;

  return null;
};

const initialSections: PnLSection[] = [
  {
    id: 'income',
    title: 'Income',
    type: 'income',
    rows: [
      { id: 'i1', name: 'Sales', values: Array(12).fill(0) },
      { id: 'i2', name: 'Lettings', values: Array(12).fill(0) },
      { id: 'i3', name: 'Mortgages', values: Array(12).fill(0) },
    ]
  },
  {
    id: 'labour',
    title: 'Staff Costs',
    type: 'cost',
    rows: [
      { id: 'l1', name: 'Employee Basic Wage', values: Array(12).fill(0) },
      { id: 'l2', name: 'Employee Commission', values: Array(12).fill(0) },
      { id: 'l3', name: 'Employer NIC\'s', values: Array(12).fill(0) },
      { id: 'l4', name: 'Employer Pensions', values: Array(12).fill(0) },
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing & Advertising',
    type: 'cost',
    rows: [
      { id: 'm1', name: 'Rightmove', values: Array(12).fill(0) },
      { id: 'm2', name: 'Google', values: Array(12).fill(0) },
      { id: 'm3', name: 'Facebook', values: Array(12).fill(0) },
    ]
  },
  {
    id: 'fixed',
    title: 'Fixed Costs',
    type: 'cost',
    rows: [
      { id: 'f1', name: 'Rent', values: Array(12).fill(0) },
      { id: 'f2', name: 'Rates', values: Array(12).fill(0) },
      { id: 'f3', name: 'Utilities', values: Array(12).fill(0) },
    ]
  }
];

interface ProfitAndLossViewProps {
  agencyId?: string;
  branchName?: string;
}

export function ProfitAndLossView({ agencyId, branchName }: ProfitAndLossViewProps) {
  const { toast } = useToast();
  const { movements, staffMembers = [], clientId, loadMovements, loadStaffMembers } = useDashboardStore();
  const [b2bReferrals, setB2bReferrals] = useState<B2BReferralRow[]>([]);
  const { user } = useAuthStore();
  const authRole = getUserRole(user);
  const canPersistPnl = ['owner', 'admin', 'client', 'agency_user', 'branch_manager'].includes(authRole ?? '');
  const [period, setPeriod] = useState<Period>('monthly');
  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()));
  const [yearSelectionLocked, setYearSelectionLocked] = useState(false);
  const [sections, setSections] = useState<PnLSection[]>(initialSections);
  const [activeSectionId, setActiveSectionId] = useState<string>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [dbLoading, setDbLoading] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Monotonically increasing counter that forces the compute effect to re-run
  // after every DB load, regardless of how React batches dbLoading transitions.
  const [dbLoadVersion, setDbLoadVersion] = useState(0);
  const viewRef = useRef<HTMLDivElement | null>(null);
  
  // Delete confirmation state
  const [deleteRowDialog, setDeleteRowDialog] = useState<{ open: boolean; sectionId: string; rowId: string; rowName: string }>({ open: false, sectionId: '', rowId: '', rowName: '' });
  const [deleteSectionDialog, setDeleteSectionDialog] = useState<{ open: boolean; sectionId: string; sectionTitle: string }>({ open: false, sectionId: '', sectionTitle: '' });
  
  // Edit mode for section titles
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState<string>('');

  const pnlScopeBase = clientId ? `client:${clientId}` : 'agency';
  const pnlScope = branchName ? `${pnlScopeBase}:branch:${branchName}` : pnlScopeBase;
  const movementYears = useMemo(() => {
    const years = new Set<number>();
    for (const movement of movements ?? []) {
      if (branchName && movement.branch !== branchName) continue;
      const movementDate = parseMovementDate(movement.date);
      if (!movementDate) continue;
      years.add(getYear(movementDate));
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [movements, branchName]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear - 2, currentYear - 1, currentYear, currentYear + 1]);
    for (const y of movementYears) years.add(y);
    return Array.from(years).sort((a, b) => b - a);
  }, [movementYears]);

  // Ensure movements/staff/B2B referrals are refreshed when P&L is opened so analytics has real source data.
  useEffect(() => {
    if (!agencyId) return;
    void Promise.all([
      loadMovements(agencyId, clientId ?? undefined),
      loadStaffMembers(agencyId, clientId ?? undefined),
      fetchB2BReferrals(agencyId, clientId ?? undefined).then(setB2bReferrals),
    ]);
  }, [agencyId, clientId, loadMovements, loadStaffMembers]);

  // Auto-pick latest year with movement activity once (unless user manually changes year).
  useEffect(() => {
    if (yearSelectionLocked) return;
    if (movementYears.length === 0) return;
    setYear(String(movementYears[0]));
  }, [movementYears, yearSelectionLocked]);

  useEffect(() => {
    let cancelled = false;

    const loadFromDb = async () => {
      if (!agencyId) return;

      const yearInt = parseInt(year);
      if (Number.isNaN(yearInt)) return;

      setDbLoading(true);
      try {
        const row = canPersistPnl
          ? await ensureDefaultPnlStatement(agencyId, pnlScope, yearInt, initialSections)
          : await fetchPnlStatement(agencyId, pnlScope, yearInt);

        // If the effect was cleaned up (deps changed), discard the stale response.
        if (cancelled) return;

        if (row?.data && Array.isArray(row.data)) {
          setSections(normalizePnlSections(row.data as PnLSection[]));
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('Could not load P&L statement from database (permission may be restricted), keeping computed local state', error);
      }

      setDbLoading(false);
      // Always bump version so the compute effect re-runs, even if React
      // batched the dbLoading true→false transition into a single render.
      setDbLoadVersion((v) => v + 1);
    };

    void loadFromDb();
    return () => { cancelled = true; };
  }, [agencyId, pnlScope, year, canPersistPnl]);

  const handleSaveToDb = async () => {
    if (!agencyId) {
      alert('No agencyId available — cannot save to database.');
      return;
    }
    if (!canPersistPnl) {
      return;
    }

    const yearInt = parseInt(year);
    if (Number.isNaN(yearInt)) {
      alert('Invalid year.');
      return;
    }

    setDbSaving(true);
    const saved = await upsertPnlStatement(agencyId, pnlScope, yearInt, sections);
    setDbSaving(false);

    if (!saved) {
      alert('Failed to save Profit & Loss statement.');
      return;
    }
  };

  // Calculate Income and Staff Costs from live movement/staff data.
  // In DB-backed mode, only auto-fill rows that are still all-zero defaults.
  // We skip while the DB is loading and re-run once it completes so computed
  // values are applied on top of the persisted data, not overwritten by it.
  useEffect(() => {
    if (dbLoading) return;

    const selectedYearInt = parseInt(year);
    if (Number.isNaN(selectedYearInt)) return;

    const salesRevenue = Array(12).fill(0);
    const lettingsRevenue = Array(12).fill(0);
    const mortgagesRevenue = Array(12).fill(0);

    // Calculate Income from movement sales/lettings using real movement amounts.
    if (Array.isArray(movements)) {
      movements.forEach((m) => {
        // Filter by branch if branchName is provided
        if (branchName && m.branch !== branchName) return;
        const rawType = (m.type ?? '').toString().trim().toLowerCase();
        const normalizedType =
          rawType === 'sales'
            ? 'sale'
            : ['letting', 'let', 'lettings', 'to-let'].includes(rawType)
            ? 'letting'
            : rawType;
        if (normalizedType !== 'sale' && normalizedType !== 'letting') return;

        const normalizedStatus = (m.status ?? '').toString().trim().toLowerCase();
        // Exclude explicit non-revenue statuses; include the rest for movement-driven monthly analytics.
        if (['abort', 'withdrawn', 'withdrawn-sales', 'valuation', 'valuation-referral'].includes(normalizedStatus)) {
          return;
        }

        const movementDate = parseMovementDate(m.date);
        if (!movementDate) return;
        const movementYear = getYear(movementDate);
        if (movementYear !== selectedYearInt) return;

        const monthIndex = getMonth(movementDate);

        // Prefer explicit fee amount; fallback to movement price as the real amount.
        const amount = toFiniteNumber(m.feeAmount ?? m.price ?? 0);
        if (amount <= 0) return;

        if (normalizedType === 'sale') {
          salesRevenue[monthIndex] += amount;
        } else {
          lettingsRevenue[monthIndex] += amount;
        }
      });
    }

    // Calculate Income from B2B referrals (mortgages and other commission-based referrals)
    if (Array.isArray(b2bReferrals)) {
      b2bReferrals.forEach((referral) => {
        // Filter by branch if branchName is provided
        if (branchName && referral.branch_id !== branchName) return;
        
        // Only count completed/paid referrals
        const normalizedStatus = (referral.status ?? '').toString().trim().toLowerCase();
        if (!['completed', 'paid', 'settled'].includes(normalizedStatus)) return;

        const referralDate = parseMovementDate(referral.referral_date);
        if (!referralDate) return;
        const referralYear = getYear(referralDate);
        if (referralYear !== selectedYearInt) return;

        const monthIndex = getMonth(referralDate);
        const commissionAmount = toFiniteNumber(referral.commission_amount ?? 0);
        if (commissionAmount <= 0) return;

        // Add all B2B commission to the Mortgages category
        // (You can add more logic here to split by transaction_type if needed)
        mortgagesRevenue[monthIndex] += commissionAmount;
      });
    }

    // Calculate Staff Costs (Monthly recurring)
    let safeStaffMembers = Array.isArray(staffMembers) ? staffMembers : [];
    
    // Filter staff by branch if branchName is provided
    if (branchName) {
      safeStaffMembers = safeStaffMembers.filter(s => s.branch === branchName);
    }
    
    const totalBasicWage = safeStaffMembers.reduce((sum, s) => sum + toFiniteNumber(s.basicWage), 0);
    
    // Calculate total commission (monthly fixed amounts)
    // Note: Percentage commissions are calculated per deal, not as a monthly recurring cost
    // Only fixed commission amounts are recurring monthly costs
    const totalCommission = safeStaffMembers.reduce((sum, s) => {
      let staffComm = 0;
      if (s.commissionBreakdown) {
        // Sum up ONLY fixed commissions (these are monthly recurring amounts)
        staffComm += s.commissionBreakdown.sales.filter(i => i.type === 'fixed').reduce((acc, i) => acc + toFiniteNumber(i.value), 0);
        staffComm += s.commissionBreakdown.lettings.filter(i => i.type === 'fixed').reduce((acc, i) => acc + toFiniteNumber(i.value), 0);
        // Note: Percentage commissions are deal-based, not monthly recurring
        // They would need to be calculated from actual movements to be accurate
      }
      return sum + staffComm;
    }, 0);
    const totalNICs = safeStaffMembers.reduce((sum, s) => sum + toFiniteNumber(s.employerNICs), 0);
    const totalPensions = safeStaffMembers.reduce((sum, s) => sum + toFiniteNumber(s.employerPension), 0);

    // Only fill staff costs for months that have elapsed.
    // Past years: all 12 months. Current year: up to current month. Future years: none.
    const now = new Date();
    const currentRealMonth = now.getMonth(); // 0-11
    const currentRealYear = now.getFullYear();
    const lastFilledMonth =
      selectedYearInt < currentRealYear ? 11 :
      selectedYearInt === currentRealYear ? currentRealMonth :
      -1; // future year — no actual costs yet

    const buildMonthlyRow = (monthlyAmount: number): number[] =>
      Array.from({ length: 12 }, (_, i) => (i <= lastFilledMonth ? monthlyAmount : 0));

    const basicWageRow = buildMonthlyRow(totalBasicWage);
    const commissionRow = buildMonthlyRow(totalCommission);
    const nicsRow = buildMonthlyRow(totalNICs);
    const pensionsRow = buildMonthlyRow(totalPensions);

    const computedValuesByRowName = new Map<string, number[]>([
      ['sales', salesRevenue],
      ['lettings', lettingsRevenue],
      ['mortgages', mortgagesRevenue],
      ['employee basic wage', basicWageRow],
      ['employee commission', commissionRow],
      ["employer nic's", nicsRow],
      ['employer pensions', pensionsRow],
    ]);

    setSections((prevSections) =>
      prevSections.map((section) => ({
        ...section,
        rows: section.rows.map((row) => {
          const key = row.name.trim().toLowerCase();
          const computedValues = computedValuesByRowName.get(key);
          if (!computedValues) return row;

          // Local mode: always derive these core analytics from live data.
          if (!agencyId) {
            return { ...row, values: computedValues };
          }

          // DB mode: keep user-entered values; only fill untouched (all-zero) rows.
          return isAllZeroValues(row.values) ? { ...row, values: computedValues } : row;
        }),
      }))
    );
  }, [movements, b2bReferrals, year, staffMembers, branchName, agencyId, dbLoading, dbLoadVersion]);

  // Helper to aggregate values based on period
  const getAggregatedValues = (values: number[]) => {
    const safeValues = normalizeValuesTo12Months(values);
    if (period === 'monthly') return safeValues;
    if (period === 'quarterly') {
      return [
        safeValues.slice(0, 3).reduce((a, b) => a + b, 0),
        safeValues.slice(3, 6).reduce((a, b) => a + b, 0),
        safeValues.slice(6, 9).reduce((a, b) => a + b, 0),
        safeValues.slice(9, 12).reduce((a, b) => a + b, 0),
      ];
    }
    if (period === 'half-yearly') {
      return [
        safeValues.slice(0, 6).reduce((a, b) => a + b, 0),
        safeValues.slice(6, 12).reduce((a, b) => a + b, 0),
      ];
    }
    // yearly
    return [safeValues.reduce((a, b) => a + b, 0)];
  };

  const getColumns = () => {
    let cols = [];
    if (period === 'monthly') cols = MONTHS;
    else if (period === 'quarterly') cols = QUARTERS;
    else if (period === 'half-yearly') cols = HALVES;
    else cols = ['Year Total'];

    if (compareMode) {
      return cols.flatMap(col => [col, `${col} (LY)`]); 
    }
    return cols;
  };

  const columns = getColumns();

  const handleFillNext = (
    sectionId: string,
    rowId: string,
    currentIndex: number,
    value: number
  ) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          rows: section.rows.map(row => {
            if (row.id === rowId) {
              const newValues = [...row.values];
              // Copy only to the next month if it exists
              if (currentIndex < 11) {
                newValues[currentIndex + 1] = value;
              }
              return { ...row, values: newValues };
            }
            return row;
          })
        };
      }
      return section;
    }));
  };

  const handleValueChange = (
    sectionId: string,
    rowId: string,
    colIndex: number,
    newValue: string
  ) => {
    const numValue = parseFloat(newValue) || 0;
    
    if (period !== 'monthly') {
      alert("Please switch to Monthly view to edit figures precisely.");
      return;
    }

    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          rows: section.rows.map(row => {
            if (row.id === rowId) {
              const newValues = [...row.values];
              newValues[colIndex] = numValue;
              return { ...row, values: newValues };
            }
            return row;
          })
        };
      }
      return section;
    }));
  };

  const addRow = (sectionId: string) => {
    const newRow: PnLRow = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Item',
      values: Array(12).fill(0)
    };

    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, rows: [...s.rows, newRow] } : s
    ));
  };

  const addCategory = (type: 'income' | 'cost') => {
    const newSection: PnLSection = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Category',
      type: type,
      rows: []
    };
    setSections(prev => [...prev, newSection]);
  };

  const updateRowName = (sectionId: string, rowId: string, newName: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          rows: s.rows.map(r => r.id === rowId ? { ...r, name: newName } : r)
        };
      }
      return s;
    }));
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return { ...s, title: newTitle };
      }
      return s;
    }));
  };

  // Delete row
  const deleteRow = () => {
    const { sectionId, rowId } = deleteRowDialog;
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          rows: section.rows.filter(row => row.id !== rowId)
        };
      }
      return section;
    }));
    setDeleteRowDialog({ open: false, sectionId: '', rowId: '', rowName: '' });
    toast({
      title: 'Item Deleted',
      description: 'The item has been removed from the statement.',
    });
  };

  // Delete section
  const deleteSection = () => {
    const { sectionId } = deleteSectionDialog;
    setSections(prev => prev.filter(section => section.id !== sectionId));
    setDeleteSectionDialog({ open: false, sectionId: '', sectionTitle: '' });
    if (activeSectionId === sectionId) {
      setActiveSectionId('all');
    }
    toast({
      title: 'Category Deleted',
      description: 'The category and all its items have been removed.',
    });
  };

  // Start editing section title
  const startEditingSection = (sectionId: string, currentTitle: string) => {
    setEditingSectionId(sectionId);
    setEditingSectionTitle(currentTitle);
  };

  // Save section title edit
  const saveEditingSection = () => {
    if (editingSectionId && editingSectionTitle.trim()) {
      updateSectionTitle(editingSectionId, editingSectionTitle.trim());
    }
    setEditingSectionId(null);
    setEditingSectionTitle('');
  };

  // Cancel section title edit
  const cancelEditingSection = () => {
    setEditingSectionId(null);
    setEditingSectionTitle('');
  };

  const formatCurrency = (val: number, opts?: { hideZero?: boolean; compact?: boolean }) => {
    const safeValue = toFiniteNumber(val);
    if (opts?.hideZero && Math.abs(safeValue) < 0.01) return '';
    if (opts?.compact) {
      const abs = Math.abs(safeValue);
      if (abs >= 1_000_000) return `£${(safeValue / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `£${(safeValue / 1_000).toFixed(1)}K`;
      return `£${safeValue.toFixed(0)}`;
    }
    return `£${safeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyCard = (val: number) => {
    const safeValue = toFiniteNumber(val);
    const abs = Math.abs(safeValue);
    if (abs >= 1_000_000) return `£${(safeValue / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `£${(safeValue / 1_000).toFixed(2)}K`;
    return `£${safeValue.toFixed(0)}`;
  };

  // Calculations
  const calculateSectionTotals = (section: PnLSection) => {
    const baseTotals = Array(getColumns().length / (compareMode ? 2 : 1)).fill(0);
    
    section.rows.forEach(row => {
      const aggregated = getAggregatedValues(row.values);
      aggregated.forEach((val, idx) => baseTotals[idx] += val);
    });

    if (compareMode) {
        return baseTotals.flatMap(val => [val, val * 0.9]); // Mock LY total as 90%
    }
    return baseTotals;
  };

  const totalCosts = useMemo(() => {
    const totals = Array(columns.length).fill(0);
    sections.filter(s => s.type === 'cost').forEach(section => {
      const sectionTotals = calculateSectionTotals(section);
      sectionTotals.forEach((val, idx) => totals[idx] += val);
    });
    return totals;
  }, [sections, period, compareMode]);

  const totalIncome = useMemo(() => {
    const totals = Array(columns.length).fill(0);
    sections.filter(s => s.type === 'income').forEach(section => {
      const sectionTotals = calculateSectionTotals(section);
      sectionTotals.forEach((val, idx) => totals[idx] += val);
    });
    return totals;
  }, [sections, period, compareMode]);

  const profitLoss = useMemo(
    () => totalIncome.map((inc, idx) => inc - (totalCosts[idx] ?? 0)),
    [totalIncome, totalCosts]
  );

  // Calculate dynamic summary cards data from P&L
  const summaryCardsData = useMemo(() => {
    const selectedYearInt = parseInt(year);
    const now = new Date();
    const realYear = now.getFullYear();
    // For the current year use the real current month; for past years use December; for future years use January.
    const currentMonth = selectedYearInt === realYear
      ? now.getMonth()
      : selectedYearInt < realYear ? 11 : 0;
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    // Helper to sum values for a range of months
    const sumForRange = (values: number[], startMonth: number, endMonth: number) => {
      let sum = 0;
      for (let i = startMonth; i <= endMonth; i++) {
        sum += toFiniteNumber(values[i]);
      }
      return sum;
    };

    // Calculate totals for different periods
    const getIncomeForRange = (startMonth: number, endMonth: number) => {
      return sections
        .filter(s => s.type === 'income')
        .reduce((total, section) => {
          return total + section.rows.reduce((rowTotal, row) => {
            return rowTotal + sumForRange(row.values, startMonth, endMonth);
          }, 0);
        }, 0);
    };

    const getExpensesForRange = (startMonth: number, endMonth: number) => {
      return sections
        .filter(s => s.type === 'cost')
        .reduce((total, section) => {
          return total + section.rows.reduce((rowTotal, row) => {
            return rowTotal + sumForRange(row.values, startMonth, endMonth);
          }, 0);
        }, 0);
    };

    // Find record month (highest profit)
    const monthlyProfits = Array(12).fill(0).map((_, month) => {
      const income = getIncomeForRange(month, month);
      const expenses = getExpensesForRange(month, month);
      return { month, profit: income - expenses, income, expenses };
    });
    const recordMonth = monthlyProfits.reduce((best, current) => 
      current.profit > best.profit ? current : best, monthlyProfits[0]);

    const thisMonthIncome = getIncomeForRange(currentMonth, currentMonth);
    const thisMonthExpenses = getExpensesForRange(currentMonth, currentMonth);
    
    const lastMonthIncome = getIncomeForRange(lastMonth, lastMonth);
    const lastMonthExpenses = getExpensesForRange(lastMonth, lastMonth);

    const last3Start = currentMonth >= 2 ? currentMonth - 2 : 0;
    const last3Income = getIncomeForRange(last3Start, currentMonth);
    const last3Expenses = getExpensesForRange(last3Start, currentMonth);

    const last6Start = currentMonth >= 5 ? currentMonth - 5 : 0;
    const last6Income = getIncomeForRange(last6Start, currentMonth);
    const last6Expenses = getExpensesForRange(last6Start, currentMonth);

    const yearIncome = getIncomeForRange(0, 11);
    const yearExpenses = getExpensesForRange(0, 11);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return [
      { 
        label: 'This Month', 
        expenses: thisMonthExpenses, 
        income: thisMonthIncome, 
        profit: thisMonthIncome - thisMonthExpenses, 
        dateRange: `${monthNames[currentMonth]} 1 - ${monthNames[currentMonth]} ${new Date(parseInt(year), currentMonth + 1, 0).getDate()}` 
      },
      { 
        label: 'Last Month', 
        expenses: lastMonthExpenses, 
        income: lastMonthIncome, 
        profit: lastMonthIncome - lastMonthExpenses, 
        dateRange: `${monthNames[lastMonth]} 1 - ${monthNames[lastMonth]} ${new Date(parseInt(year), lastMonth + 1, 0).getDate()}` 
      },
      { 
        label: 'Last 3 Months', 
        expenses: last3Expenses, 
        income: last3Income, 
        profit: last3Income - last3Expenses, 
        dateRange: `${monthNames[last3Start]} 1 - ${monthNames[currentMonth]} ${new Date(parseInt(year), currentMonth + 1, 0).getDate()}` 
      },
      { 
        label: 'Last 6 Months', 
        expenses: last6Expenses, 
        income: last6Income, 
        profit: last6Income - last6Expenses, 
        dateRange: `${monthNames[last6Start]} 1 - ${monthNames[currentMonth]} ${new Date(parseInt(year), currentMonth + 1, 0).getDate()}` 
      },
      { 
        label: 'Last 12 Months', 
        expenses: yearExpenses, 
        income: yearIncome, 
        profit: yearIncome - yearExpenses, 
        dateRange: `Jan 1 - Dec 31` 
      },
      { 
        label: 'Record Month', 
        expenses: recordMonth.expenses, 
        income: recordMonth.income, 
        profit: recordMonth.profit, 
        dateRange: `${monthNames[recordMonth.month]} ${year}` 
      },
    ];
  }, [sections, year]);

  return (
    <div ref={viewRef} className="flex flex-col h-full bg-[#F9FAFB] dark:bg-slate-950 font-sans text-gray-900 dark:text-slate-100 relative overflow-hidden">
      {/* Date Range Cards - Dynamic */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        {dbLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading financial data...</span>
          </div>
        ) : (
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-2 sm:gap-3 md:grid md:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {summaryCardsData.map((range) => (
            <Card
              key={range.label}
              className={cn(
                "bg-card text-card-foreground hover:shadow-lg transition-shadow duration-200 cursor-pointer snap-center shrink-0 w-[280px] md:w-auto border-2",
                range.profit > 0 ? "border-emerald-600" : range.profit < 0 ? "border-red-500" : "border-gray-300"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-foreground">{range.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-2">{range.dateRange}</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expenses:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrencyCard(range.expenses)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Income:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrencyCard(range.income)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-border">
                    <span className="text-foreground font-medium">Profit:</span>
                    <span className={cn(
                      "font-bold",
                      range.profit >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {formatCurrencyCard(range.profit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 bg-[#F9FAFB] dark:bg-slate-950 font-sans text-gray-900 dark:text-slate-100 relative overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      <div className={cn(
        "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex-col h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        "hidden lg:flex", // Hide on mobile, show on large screens
        isSidebarCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
      )}>
        <div className="p-4 flex items-center justify-end border-b border-gray-100 dark:border-slate-800">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600" onClick={() => setIsSidebarCollapsed(true)}>
                <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
          </div>
          <PnLSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
        
        <div className="px-3 py-3">
           <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input 
                className="w-full bg-gray-50 dark:bg-slate-800 text-sm pl-8 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-900 dark:text-slate-100" 
                placeholder="Search..." 
              />
           </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-4 py-2">
            <button 
                onClick={() => setActiveSectionId('all')}
                className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all group",
                    activeSectionId === 'all'
                        ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-medium" 
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                )}
            >
                <FileText className={cn("w-4 h-4", activeSectionId === 'all' ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-500 dark:group-hover:text-slate-400")} />
                <span>Full Statement</span>
            </button>

            <div className="px-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs h-8 border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={() => addCategory('cost')}
                >
                    <Plus className="w-3 h-3 mr-2" /> Add Category
                </Button>
            </div>

            {/* Income Group */}
            <div>
                <div className="flex items-center justify-between px-2 py-1 mb-1 group">
                    <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                        Revenue
                    </div>
                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => addCategory('income')}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                {sections.filter(s => s.type === 'income').map(section => (
                    <button 
                        key={section.id}
                        onClick={() => {
                            const el = document.getElementById(`section-${section.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                            setActiveSectionId(section.id);
                        }}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all group",
                            activeSectionId === section.id 
                                ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-medium" 
                                : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                        )}
                    >
                        <Folder className={cn("w-4 h-4", activeSectionId === section.id ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-slate-500 group-hover:text-gray-500 dark:group-hover:text-slate-400")} />
                        <span>{section.title}</span>
                        <span className="ml-auto text-xs text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm">{section.rows.length}</span>
                    </button>
                ))}
            </div>

            {/* Costs Group */}
            <div>
                <div className="flex items-center justify-between px-2 py-1 mb-1 group">
                    <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                        Expenses
                    </div>
                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => addCategory('cost')}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                {sections.filter(s => s.type === 'cost').map(section => (
                    <button 
                        key={section.id}
                        onClick={() => {
                            const el = document.getElementById(`section-${section.id}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                            setActiveSectionId(section.id);
                        }}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all group",
                            activeSectionId === section.id 
                                ? "bg-blue-50 text-blue-700 font-medium" 
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                    >
                        <Folder className={cn("w-4 h-4", activeSectionId === section.id ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500")} />
                        <span>{section.title}</span>
                        <span className="ml-auto text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-100 shadow-sm">{section.rows.length}</span>
                    </button>
                ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Expand Button (Visible when collapsed) */}
      {isSidebarCollapsed && (
        <div className="absolute left-0 top-4 z-20">
            <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 rounded-r-md shadow-md border border-l-0 border-gray-200 bg-white hover:bg-gray-50"
                onClick={() => setIsSidebarCollapsed(false)}
            >
                <PanelLeftOpen className="w-4 h-4 text-gray-600" />
            </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className={cn(
            "min-h-[3.5rem] sm:h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-6 py-2 sm:py-0 gap-2 sm:gap-0 shrink-0 transition-all duration-300",
            isSidebarCollapsed ? "lg:pl-12" : ""
        )}>
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden w-full sm:w-auto">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">Profit & Loss Statement</h1>
                <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-slate-700 mx-2" />
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                    <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-medium text-gray-700 dark:text-slate-300">{sections.reduce((acc, s) => acc + s.rows.length, 0)} Items</span>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="hidden sm:flex items-center gap-2">
                    <Switch id="show-trends" checked={showTrends} onCheckedChange={setShowTrends} />
                    <Label htmlFor="show-trends" className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">Trends</Label>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <Switch id="compare-mode" checked={compareMode} onCheckedChange={setCompareMode} />
                    <Label htmlFor="compare-mode" className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">Compare LY</Label>
                </div>

                <Select value={year} onValueChange={(v) => { setYear(v); setYearSelectionLocked(true); }}>
                    <SelectTrigger className="w-[80px] sm:w-[100px] h-8 sm:h-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                        {yearOptions.map((yearOption) => (
                          <SelectItem key={yearOption} value={String(yearOption)}>
                            {yearOption}
                          </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
                    <SelectTrigger className="w-[100px] sm:w-[140px] h-8 sm:h-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-gray-500 dark:text-slate-400" />
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half-yearly">Half Yearly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                
                <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-slate-700" />
                
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 sm:h-9 px-2 sm:px-3 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs"
                    disabled={exporting}
                    onClick={async () => {
                      if (!viewRef.current) return;
                      try {
                        setExporting(true);
                        await exportElementToPdf(viewRef.current, {
                          filename: `pnl-${branchName || 'agency'}-${year}.pdf`,
                          orientation: 'landscape',
                          capture: 'scroll',
                          marginPt: 16,
                        });
                      } finally {
                        setExporting(false);
                      }
                    }}
                >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-2" /> 
                    <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
                </Button>
                <Button
                    size="sm"
                    onClick={() => void handleSaveToDb()}
                    disabled={!canPersistPnl || (!!agencyId && (dbLoading || dbSaving))}
                    className="h-8 sm:h-9 px-2 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs"
                >
                    <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-2" /> 
                    <span className="hidden sm:inline">{dbSaving ? 'Saving…' : 'Save'}</span>
                </Button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-[#F9FAFB] dark:bg-slate-950 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8">
            {sections.map((section) => (
                <div key={section.id} id={`section-${section.id}`} className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden scroll-mt-6">
                    {/* Section Header */}
                    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between group">
                        <Input 
                            value={section.title} 
                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                            className="h-8 border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 bg-transparent px-2 text-lg font-bold text-gray-900 dark:text-slate-100 shadow-none w-auto min-w-[200px]"
                        />
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide",
                                section.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                                {section.type === 'income' ? 'Revenue' : 'Expense'}
                            </span>
                            <button
                                onClick={() => setDeleteSectionDialog({ open: true, sectionId: section.id, sectionTitle: section.title })}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Delete section"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Table Header - Responsive */}
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] md:grid-cols-[250px_1fr] border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 sticky top-0 z-10">
                            <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-r border-gray-100 dark:border-slate-700">
                                Description
                            </div>
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(80px, 1fr))` }}>
                                {columns.map((col, i) => (
                                    <div key={i} className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right border-r border-gray-100 dark:border-slate-700 last:border-r-0">
                                        {col}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {section.rows.map((row) => (
                                <div key={row.id} className="min-w-[600px] grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] md:grid-cols-[250px_1fr] group hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    {/* Row Header */}
                                    <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border-r border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/50 relative">
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1",
                                        section.type === 'income' ? "bg-green-500" : "bg-red-500"
                                    )} />
                                    <Input 
                                        value={row.name} 
                                        onChange={(e) => updateRowName(section.id, row.id, e.target.value)}
                                        className="h-8 border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 bg-transparent px-2 text-sm font-medium text-gray-900 dark:text-slate-100 shadow-none flex-1"
                                    />
                                    <button
                                        onClick={() => setDeleteRowDialog({ open: true, sectionId: section.id, rowId: row.id, rowName: row.name })}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                                        title="Delete row"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                {/* Row Values */}
                                    <div className="grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(80px, 1fr))` }}>
                                        {getAggregatedValues(row.values).flatMap((val, idx) => {
                                            const prevVal = val * (0.8 + Math.random() * 0.4);
                                            const diff = val - prevVal;
                                            const isPositive = diff > 0;
                                            const isGood = section.type === 'income' ? isPositive : !isPositive;
                                            
                                            const cells = [
                                                <div key={`${idx}-curr`} className="px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-100 dark:border-slate-700 last:border-r-0 flex items-center justify-end relative group/cell">
                                                {showTrends && (
                                                    <div className={cn(
                                                        "absolute left-2 top-1/2 -translate-y-1/2 flex items-center text-[10px] font-medium",
                                                        isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                    )}>
                                                        {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                                        {Math.abs(((diff / prevVal) * 100)).toFixed(0)}%
                                                    </div>
                                                )}
                                                    <Input 
                                                        type="number"
                                                        value={val}
                                                        onChange={(e) => handleValueChange(section.id, row.id, idx, e.target.value)}
                                                        className={cn(
                                                            "h-7 sm:h-8 text-right border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 bg-transparent px-1 sm:px-2 text-xs sm:text-sm text-gray-600 dark:text-slate-300 shadow-none pr-5 sm:pr-6",
                                                            showTrends && "pl-8 sm:pl-12"
                                                        )}
                                                        disabled={period !== 'monthly'}
                                                    />
                                                {period === 'monthly' && idx < 11 && (
                                                    <button
                                                        onClick={() => handleFillNext(section.id, row.id, idx, val)}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1"
                                                        title="Copy to next month"
                                                    >
                                                        <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ];
                                        if (compareMode) {
                                            cells.push(
                                                <div key={`${idx}-prev`} className="px-2 py-3 border-r border-gray-100 dark:border-slate-700 last:border-r-0 flex items-center justify-end bg-gray-50/50 dark:bg-slate-800/50">
                                                    <span className="text-sm text-gray-400 dark:text-slate-500">{formatCurrency(prevVal)}</span>
                                                </div>
                                            );
                                        }
                                        return cells;
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                        {/* Section Total Row */}
                        <div className="min-w-[600px] grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] md:grid-cols-[250px_1fr] bg-gray-100/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 font-semibold text-xs sm:text-sm">
                            <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-r border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                                Total {section.title}
                            </div>
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(80px, 1fr))` }}>
                                {calculateSectionTotals(section).map((val, idx) => (
                                    <div key={idx} title={formatCurrency(val)} className="px-1 sm:px-2 py-2 sm:py-3 border-r border-gray-200 dark:border-slate-700 last:border-r-0 flex items-center justify-end text-gray-900 dark:text-slate-100 whitespace-nowrap">
                                        {formatCurrency(val, { hideZero: true, compact: true })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add New Row Button */}
                        <div className="p-2 border-t border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/30">
                            <Button 
                                variant="ghost" 
                                onClick={() => addRow(section.id)}
                                className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 w-full justify-start h-8 sm:h-9 text-xs sm:text-sm"
                            >
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> 
                                <span className="hidden sm:inline">Add New {section.type === 'income' ? 'Income Stream' : 'Cost Item'}</span>
                                <span className="sm:hidden">Add Item</span>
                            </Button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Grand Totals - Responsive */}
            <div className="rounded-lg border border-border bg-card p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground">Total Income</span>
                    <span className="font-bold text-success text-sm sm:text-base">{formatCurrency(totalIncome.reduce((a, b) => a + b, 0))}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground">Total Costs</span>
                    <span className="font-bold text-destructive text-sm sm:text-base">{formatCurrency(totalCosts.reduce((a, b) => a + b, 0))}</span>
                </div>
                <div className="border-t border-border pt-3 sm:pt-4 mt-3 sm:mt-4">
                    {/* Simplified view for mobile */}
                    <div className="space-y-2">
                        <div className="font-bold text-sm sm:text-base text-muted-foreground mb-2">NET PROFIT / LOSS</div>
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px] grid grid-cols-[150px_1fr] sm:grid-cols-[200px_1fr] md:grid-cols-[250px_1fr]">
                                <div className="font-bold text-base sm:text-lg">Total</div>
                                <div className="grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(80px, 1fr))` }}>
                                    {profitLoss.map((val, idx) => (
                                        <div
                                            key={idx}
                                            title={formatCurrency(val)}
                                            className={cn(
                                                "text-right font-bold text-xs sm:text-sm px-1 sm:px-2 whitespace-nowrap",
                                                val >= 0 ? "text-success" : "text-destructive"
                                            )}
                                        >
                                            {formatCurrency(val)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      </div>

      {/* Delete Row Confirmation Dialog */}
      <AlertDialog open={deleteRowDialog.open} onOpenChange={(open) => setDeleteRowDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100">Delete Row</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-400">
              Are you sure you want to delete "{deleteRowDialog.rowName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteRow}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={deleteSectionDialog.open} onOpenChange={(open) => setDeleteSectionDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100">Delete Section</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-400">
              Are you sure you want to delete the entire "{deleteSectionDialog.sectionTitle}" section? This will remove all rows within it and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteSection}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
