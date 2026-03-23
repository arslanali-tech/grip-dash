import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarIcon, ClipboardCheckIcon, EditIcon, PoundSterlingIcon, TargetIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditStaffDialog } from './EditStaffDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
  subQuarters,
} from 'date-fns';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { StaffAppraisalDialog } from './StaffAppraisalDialog';
import type { Movement } from '@/stores/dashboardStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchMovements } from '@/lib/dashboardApi';
import { calculateMovementRevenue } from '@/lib/movementMetrics';
import {
  createHousekeepingRequest,
  fetchLatestStaffAppraisal,
  type StaffAppraisalPayload,
  type StaffAppraisalRequestRow,
  updateHousekeepingRequest,
} from '@/lib/housekeepingApi';
import { notifyError, notifySuccess } from '@/lib/notify';

interface StaffMember {
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
  commissionBreakdown?: {
    sales: { id: string; label: string; type: 'percentage' | 'fixed'; value: number }[];
    lettings: { id: string; label: string; type: 'percentage' | 'fixed'; value: number }[];
  };
}

interface StaffPerformanceDetailViewProps {
  staff: StaffMember;
  onClose: () => void;
  agencyId?: string;
  clientId?: string;
  branchId?: string;
  availableModules?: string[];
  canEditModules?: boolean;
  canEditProspectorDashboard?: boolean;
  onSaveStaff?: (updatedStaff: StaffMember) => void;
}

type PerformanceDateFilter = 'week' | 'month' | 'last-quarter' | 'current-quarter' | 'year-to-date' | 'custom';
type DateWindow = { from: Date; to: Date };
type PeriodMetrics = {
  activeListings: number;
  deals: number;
  revenue: number;
  valuations: number;
  exchanges: number;
  conversionRate: number;
};
type ChartPoint = { label: string; deals: number; revenue: number; valuations: number };
type TargetSnapshot = {
  deals: number;
  revenue: number;
  valuations: number;
  conversionRate: number;
  feedback: string;
  sourceLabel: string | null;
  completedBy: string | null;
  updatedAt: string | null;
};

const CURRENCY_SYMBOL = '\u00A3';
const CLOSED_STATUS_KEYS = new Set(['completed', 'exchanged', 'sale', 'let']);
const INACTIVE_STATUS_KEYS = new Set(['completed', 'exchanged', 'sale', 'let', 'abort', 'withdrawn', 'withdrawn-sales']);
const DEAL_TARGET_ALIASES = ['second hand contracts', 'new contracts res h', 'sales', 'instructions'];
const REVENUE_TARGET_ALIASES = ['total comm due', 'total revenue booked', 'cumulative total comn'];
const VALUATION_TARGET_ALIASES = ['valuations attended', 'valuations in diary', 'valuations'];

const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
const normalizeComparable = (value: string | null | undefined) => normalizeText(value).replace(/[^a-z0-9]/g, '');

const parseMovementDate = (movement: Pick<Movement, 'date' | 'createdAt'>): Date | null => {
  const rawValue = movement.date?.trim() || movement.createdAt?.trim();
  if (!rawValue) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);
  if (dateOnlyMatch) {
    return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
  }
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMovementSortValue = (movement: Pick<Movement, 'date' | 'createdAt'>) => parseMovementDate(movement)?.getTime() ?? 0;

const getMovementKey = (movement: Pick<Movement, 'id' | 'address' | 'property' | 'type'>) => {
  const composite = [
    normalizeComparable(movement.address),
    normalizeComparable(movement.property),
    normalizeComparable(movement.type),
  ].filter(Boolean).join('|');
  return composite || movement.id;
};

const matchesStaffAgent = (agent: string | null | undefined, staffName: string, staffEmail?: string) => {
  const agentKey = normalizeComparable(agent);
  const staffKey = normalizeComparable(staffName);
  const emailKey = normalizeComparable(staffEmail ?? '');
  if (!agentKey || (!staffKey && !emailKey)) return false;
  if (staffKey && (agentKey === staffKey || agentKey.includes(staffKey) || staffKey.includes(agentKey))) return true;
  if (emailKey && (agentKey === emailKey || agentKey.includes(emailKey) || emailKey.includes(agentKey))) return true;
  return false;
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

const getCommissionItemForExchanged = (
  breakdown: CommissionBreakdown | undefined,
  movementType: string | null | undefined
) => {
  const normalizedType = normalizeText(movementType);
  if (normalizedType === 'letting') {
    return findCommissionItem(breakdown?.lettings, ['let by', 'let', 'completed']);
  }
  return findCommissionItem(breakdown?.sales, ['sold', 'sale', 'exchange', 'exchanged', 'completed']);
};

const calculateStaffCommissionForMovement = (movement: Movement, staff: StaffMember): number => {
  const item = getCommissionItemForExchanged(staff.commissionBreakdown, movement.type);
  const baseFee = calculateMovementRevenue(movement);
  if (!item) return baseFee;
  const value = Number(item.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return baseFee;

  if (item.type === 'fixed') {
    return value;
  }
  const price = movement.price ?? 0;
  if (baseFee > 0) return (baseFee * value) / 100;
  if (price > 0) return (price * value) / 100;
  return baseFee;
};

const isClosedStatus = (status: string | null | undefined) => CLOSED_STATUS_KEYS.has(normalizeText(status));
const isActiveListingStatus = (status: string | null | undefined) => !INACTIVE_STATUS_KEYS.has(normalizeText(status));
const isValuationStatus = (status: string | null | undefined) => normalizeText(status) === 'valuation';

const clampDate = (date: Date, bounds: DateWindow) => (date < bounds.from ? bounds.from : date > bounds.to ? bounds.to : date);

const resolveDateWindow = (dateFilter: PerformanceDateFilter, customDateRange: DateRange | undefined): DateWindow => {
  const now = new Date();
  if (dateFilter === 'custom') {
    const from = customDateRange?.from ? startOfDay(customDateRange.from) : startOfMonth(now);
    const to = customDateRange?.to ? endOfDay(customDateRange.to) : customDateRange?.from ? endOfDay(customDateRange.from) : endOfMonth(now);
    return { from, to };
  }
  if (dateFilter === 'week') return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (dateFilter === 'last-quarter') {
    const previousQuarter = subQuarters(now, 1);
    return { from: startOfQuarter(previousQuarter), to: endOfQuarter(previousQuarter) };
  }
  if (dateFilter === 'current-quarter') return { from: startOfQuarter(now), to: endOfQuarter(now) };
  if (dateFilter === 'year-to-date') return { from: startOfYear(now), to: endOfDay(now) };
  return { from: startOfMonth(now), to: endOfMonth(now) };
};

const formatDateWindowLabel = (dateFilter: PerformanceDateFilter, window: DateWindow) => {
  if (dateFilter === 'week') return `${format(window.from, 'MMM dd')} - ${format(window.to, 'MMM dd, yyyy')}`;
  if (dateFilter === 'month') return format(window.from, 'MMMM yyyy');
  if (dateFilter === 'last-quarter' || dateFilter === 'current-quarter') return `Q${Math.floor(window.from.getMonth() / 3) + 1} ${window.from.getFullYear()}`;
  if (dateFilter === 'year-to-date') return `${format(window.from, 'MMM yyyy')} - ${format(window.to, 'MMM yyyy')}`;
  return `${format(window.from, 'MMM dd')} - ${format(window.to, 'MMM dd, yyyy')}`;
};

const formatCurrencyCompact = (value: number) => {
  if (value >= 1_000_000) return `${CURRENCY_SYMBOL}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${CURRENCY_SYMBOL}${(value / 1_000).toFixed(0)}K`;
  return `${CURRENCY_SYMBOL}${value.toLocaleString()}`;
};

const formatCurrencyFull = (value: number) => `${CURRENCY_SYMBOL}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const buildLatestPropertyMap = (movements: Movement[], endDate: Date) => {
  const latestByProperty = new Map<string, Movement>();
  for (const movement of movements) {
    const movementDate = parseMovementDate(movement);
    if (!movementDate || movementDate > endDate) continue;
    const propertyKey = getMovementKey(movement);
    const existing = latestByProperty.get(propertyKey);
    if (!existing || getMovementSortValue(movement) >= getMovementSortValue(existing)) {
      latestByProperty.set(propertyKey, movement);
    }
  }
  return latestByProperty;
};

const summarisePeriodEvents = (
  staffMovements: Movement[],
  window: DateWindow,
  revenueCalculator?: (movement: Movement) => number
) => {
  const valuationKeys = new Set<string>();
  const latestClosedByProperty = new Map<string, Movement>();

  for (const movement of staffMovements) {
    const movementDate = parseMovementDate(movement);
    if (!movementDate || movementDate < window.from || movementDate > window.to) continue;

    const propertyKey = getMovementKey(movement);
    if (isValuationStatus(movement.status)) valuationKeys.add(propertyKey);

    if (isClosedStatus(movement.status)) {
      const existing = latestClosedByProperty.get(propertyKey);
      if (!existing || getMovementSortValue(movement) >= getMovementSortValue(existing)) {
        latestClosedByProperty.set(propertyKey, movement);
      }
    }
  }

  return {
    deals: latestClosedByProperty.size,
    valuations: valuationKeys.size,
    revenue: revenueCalculator
      ? Array.from(latestClosedByProperty.values()).reduce(
          (total, movement) => total + revenueCalculator(movement),
          0
        )
      : Array.from(latestClosedByProperty.values()).reduce((total, movement) => total + (movement.feeAmount ?? 0), 0),
  };
};

const buildPeriodMetrics = (
  allMovements: Movement[],
  staffMovements: Movement[],
  staffName: string,
  staffEmail: string | undefined,
  window: DateWindow,
  revenueCalculator?: (movement: Movement) => number
): PeriodMetrics => {
  const latestByProperty = buildLatestPropertyMap(allMovements, window.to);
  const activeListings = Array.from(latestByProperty.values()).filter(
    (movement) => matchesStaffAgent(movement.agent, staffName, staffEmail) && isActiveListingStatus(movement.status)
  ).length;
  const exchangeKeys = new Set<string>();
  for (const movement of staffMovements) {
    const movementDate = parseMovementDate(movement);
    if (!movementDate || movementDate < window.from || movementDate > window.to) continue;
    if (isClosedStatus(movement.status)) {
      exchangeKeys.add(getMovementKey(movement));
    }
  }
  const summary = summarisePeriodEvents(staffMovements, window, revenueCalculator);
  return {
    activeListings,
    deals: summary.deals,
    revenue: summary.revenue,
    valuations: summary.valuations,
    exchanges: exchangeKeys.size,
    conversionRate: summary.valuations > 0 ? Math.round((summary.deals / summary.valuations) * 100) : 0,
  };
};

const buildOverviewTrend = (
  allMovements: Movement[],
  staffMovements: Movement[],
  staffName: string,
  staffEmail: string | undefined,
  endDate: Date,
  revenueCalculator?: (movement: Movement) => number
): ChartPoint[] => {
  const monthStarts = eachMonthOfInterval({ start: startOfMonth(subMonths(endDate, 5)), end: startOfMonth(endDate) });
  const spansMultipleYears = monthStarts.some((month) => month.getFullYear() !== endDate.getFullYear());

  return monthStarts.map((monthStart) => {
    const metrics = buildPeriodMetrics(allMovements, staffMovements, staffName, staffEmail, {
      from: startOfMonth(monthStart),
      to: endOfMonth(monthStart),
    }, revenueCalculator);
    return {
      label: format(monthStart, spansMultipleYears ? 'MMM yy' : 'MMM'),
      deals: metrics.deals,
      revenue: metrics.revenue,
      valuations: metrics.valuations,
    };
  });
};

const buildPerformanceBreakdown = (
  staffMovements: Movement[],
  window: DateWindow,
  dateFilter: PerformanceDateFilter,
  revenueCalculator?: (movement: Movement) => number
): ChartPoint[] => {
  const totalDays = Math.max(1, differenceInCalendarDays(window.to, window.from) + 1);

  if (dateFilter === 'week' || totalDays <= 10) {
    return eachDayOfInterval({ start: window.from, end: window.to }).map((day) => ({
      label: format(day, 'EEE d'),
      ...summarisePeriodEvents(staffMovements, { from: startOfDay(day), to: endOfDay(day) }, revenueCalculator),
    }));
  }

  if (dateFilter === 'month' || totalDays <= 62) {
    return eachWeekOfInterval({ start: window.from, end: window.to }, { weekStartsOn: 1 }).map((weekStart, index) => ({
      label: `Wk ${index + 1}`,
      ...summarisePeriodEvents(staffMovements, {
        from: clampDate(startOfDay(weekStart), window),
        to: clampDate(endOfWeek(weekStart, { weekStartsOn: 1 }), window),
      }, revenueCalculator),
    }));
  }

  const monthStarts = eachMonthOfInterval({ start: window.from, end: window.to });
  const spansMultipleYears = monthStarts.some((month) => month.getFullYear() !== window.to.getFullYear());
  return monthStarts.map((monthStart) => ({
    label: format(monthStart, spansMultipleYears ? 'MMM yy' : 'MMM'),
    ...summarisePeriodEvents(staffMovements, {
      from: clampDate(startOfMonth(monthStart), window),
      to: clampDate(endOfMonth(monthStart), window),
    }, revenueCalculator),
  }));
};

const parseTargetNumber = (value: string | null | undefined) => {
  const numericValue = Number.parseFloat((value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const findAppraisalRowValue = (payload: StaffAppraisalPayload | null, aliases: string[], monthIndexes: number[]) => {
  if (!payload) return 0;
  const row = payload.monthlyData.find((item) => aliases.some((alias) => normalizeText(item.metric).includes(alias) || alias.includes(normalizeText(item.metric))));
  if (!row) return 0;
  return monthIndexes.reduce((total, monthIndex) => total + parseTargetNumber(row.monthlyData?.[monthIndex]?.target), 0);
};

const buildTargetSnapshot = (appraisal: StaffAppraisalRequestRow | null, window: DateWindow): TargetSnapshot => {
  const payload = appraisal?.payload ?? null;
  const monthIndexes = eachMonthOfInterval({ start: window.from, end: window.to }).map((month) => month.getMonth());
  const deals = findAppraisalRowValue(payload, DEAL_TARGET_ALIASES, monthIndexes);
  const revenue = findAppraisalRowValue(payload, REVENUE_TARGET_ALIASES, monthIndexes);
  const valuations = findAppraisalRowValue(payload, VALUATION_TARGET_ALIASES, monthIndexes);
  const savedMonth = payload?.month === 'all' ? 'All Months' : payload?.month ?? null;
  return {
    deals,
    revenue,
    valuations,
    conversionRate: valuations > 0 ? Math.round((deals / valuations) * 100) : 0,
    feedback: payload?.notes?.trim() ?? '',
    sourceLabel: payload ? `${savedMonth ?? 'Appraisal'} ${payload.year}`.trim() : null,
    completedBy: payload?.completedBy ?? appraisal?.requested_by ?? null,
    updatedAt: appraisal?.updated_at ?? appraisal?.created_at ?? null,
  };
};

const TargetMetricCard = ({
  title,
  actual,
  target,
  icon,
  formatter = (value: number) => value.toLocaleString(),
}: {
  title: string;
  actual: number;
  target: number;
  icon: ReactNode;
  formatter?: (value: number) => string;
}) => {
  const hasTarget = target > 0;
  const targetMet = hasTarget && actual >= target;
  return (
    <Card className={cn('border-l-4', targetMet ? 'border-l-green-500' : 'border-l-orange-500')}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{formatter(actual)}</span>
          <span className="text-sm text-muted-foreground">/ {hasTarget ? formatter(target) : 'No target'}</span>
        </div>
        <p className={cn('mt-1 text-xs font-medium', !hasTarget ? 'text-muted-foreground' : targetMet ? 'text-green-600' : 'text-orange-600')}>
          {!hasTarget ? 'No target set in latest appraisal' : targetMet ? 'Target met' : 'Below target'}
        </p>
      </CardContent>
    </Card>
  );
};

export function StaffPerformanceDetailView({ staff, onClose, agencyId, clientId, branchId, availableModules, canEditModules = false, canEditProspectorDashboard = false, onSaveStaff }: StaffPerformanceDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<PerformanceDateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [movementRows, setMovementRows] = useState<Movement[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [latestAppraisal, setLatestAppraisal] = useState<StaffAppraisalRequestRow | null>(null);
  const [loadingAppraisal, setLoadingAppraisal] = useState(false);
  const [appraisalRefreshKey, setAppraisalRefreshKey] = useState(0);

  const dashboardAgencyId = useDashboardStore((state) => state.agencyId);
  const dashboardClientId = useDashboardStore((state) => state.clientId);
  const dashboardMovements = useDashboardStore((state) => state.movements);
  const user = useAuthStore((state) => state.user);

  const effectiveAgencyId = agencyId ?? dashboardAgencyId ?? undefined;
  const effectiveClientId = clientId ?? dashboardClientId ?? undefined;
  const selectedWindow = useMemo(() => resolveDateWindow(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const selectedRangeLabel = useMemo(() => formatDateWindowLabel(dateFilter, selectedWindow), [dateFilter, selectedWindow]);
  const currentUserName =
    (user?.user_metadata as { name?: string; full_name?: string } | undefined)?.name ??
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    (user?.app_metadata as { name?: string } | undefined)?.name ??
    user?.email ??
    'Current User';

  useEffect(() => {
    if (dashboardMovements.length > 0) setMovementRows(dashboardMovements);
  }, [dashboardMovements]);

  useEffect(() => {
    if (!effectiveAgencyId) {
      setMovementRows(dashboardMovements);
      setLoadingPerformance(false);
      return;
    }

    let cancelled = false;
    const loadPerformanceData = async () => {
      setLoadingPerformance(true);
      const rows = await fetchMovements(effectiveAgencyId, effectiveClientId);
      if (!cancelled) {
        setMovementRows(rows);
        setLoadingPerformance(false);
      }
    };
    void loadPerformanceData();
    return () => {
      cancelled = true;
    };
  }, [dashboardMovements, effectiveAgencyId, effectiveClientId]);

  useEffect(() => {
    if (!effectiveAgencyId) {
      setLatestAppraisal(null);
      setLoadingAppraisal(false);
      return;
    }

    let cancelled = false;
    const loadLatestAppraisal = async () => {
      setLoadingAppraisal(true);
      const year = format(selectedWindow.to, 'yyyy');
      const currentYearAppraisal = await fetchLatestStaffAppraisal({
        agencyId: effectiveAgencyId,
        staffId: staff.id,
        staffName: staff.name,
        year,
      });
      const appraisal =
        currentYearAppraisal ??
        (await fetchLatestStaffAppraisal({
          agencyId: effectiveAgencyId,
          staffId: staff.id,
          staffName: staff.name,
        }));

      if (!cancelled) {
        setLatestAppraisal(appraisal);
        setLoadingAppraisal(false);
      }
    };
    void loadLatestAppraisal();
    return () => {
      cancelled = true;
    };
  }, [appraisalRefreshKey, effectiveAgencyId, selectedWindow.to, staff.id, staff.name]);

  const staffMovements = useMemo(
    () => movementRows.filter((movement) => matchesStaffAgent(movement.agent, staff.name, staff.email)),
    [movementRows, staff.name, staff.email]
  );
  const revenueCalculator = useCallback(
    (movement: Movement) => calculateStaffCommissionForMovement(movement, staff),
    [staff]
  );
  const periodMetrics = useMemo(
    () => buildPeriodMetrics(movementRows, staffMovements, staff.name, staff.email, selectedWindow, revenueCalculator),
    [movementRows, selectedWindow, staff.name, staff.email, staffMovements, revenueCalculator]
  );
  const overviewTrend = useMemo(
    () => buildOverviewTrend(movementRows, staffMovements, staff.name, staff.email, selectedWindow.to, revenueCalculator),
    [movementRows, selectedWindow.to, staff.name, staff.email, staffMovements, revenueCalculator]
  );
  const performanceBreakdown = useMemo(
    () => buildPerformanceBreakdown(staffMovements, selectedWindow, dateFilter, revenueCalculator),
    [dateFilter, selectedWindow, staffMovements, revenueCalculator]
  );
  const targets = useMemo(() => buildTargetSnapshot(latestAppraisal, selectedWindow), [latestAppraisal, selectedWindow]);
  const sameMonthSelection =
    selectedWindow.from.getMonth() === selectedWindow.to.getMonth() &&
    selectedWindow.from.getFullYear() === selectedWindow.to.getFullYear();

  const handleSaveAppraisal = async (data: StaffAppraisalPayload) => {
    if (!effectiveAgencyId) {
      notifyError('Agency not found.');
      return;
    }

    const payload: StaffAppraisalPayload = {
      ...data,
      staffId: staff.id,
      staffEmail: staff.email,
      staffName: staff.name,
      staffBranch: staff.branch,
      completedBy: currentUserName,
      completedAt: new Date().toISOString(),
    };

    const savedRequest = payload.requestId
      ? await updateHousekeepingRequest(payload.requestId, {
          status: 'completed',
          payload,
          staff_id: staff.id,
          staff_name: staff.name,
          branch_id: branchId ?? null,
        })
      : await createHousekeepingRequest({
          agency_id: effectiveAgencyId,
          branch_id: branchId ?? null,
          request_type: 'staff_appraisal',
          staff_id: staff.id,
          staff_name: staff.name,
          requested_by: currentUserName,
          payload,
          status: 'completed',
        });

    if (!savedRequest) {
      notifyError('Failed to save appraisal. Please try again.');
      return;
    }

    notifySuccess(`Appraisal saved for ${staff.name}`);
    setAppraisalOpen(false);
    setAppraisalRefreshKey((previous) => previous + 1);
  };

  const handleSaveStaff = (updatedStaff: StaffMember) => {
    onSaveStaff?.(updatedStaff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="shrink-0 border-b border-border bg-card px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={staff.avatar} alt={staff.name} className="h-12 w-12 rounded-full object-cover" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{staff.name}</h1>
                <p className="text-sm text-muted-foreground">{staff.role} / {staff.branch}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-2 border-border hover:bg-accent hover:text-accent-foreground" onClick={() => setEditStaffOpen(true)}>
                <EditIcon className="h-4 w-4" strokeWidth={1.5} />
                Staff Profile
              </Button>
              <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAppraisalOpen(true)}>
                <ClipboardCheckIcon className="h-4 w-4" strokeWidth={1.5} />
                Staff Appraisal
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-accent">
                <XIcon className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="mr-2 text-sm text-muted-foreground">Period:</span>
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as PerformanceDateFilter)}>
              <SelectTrigger className="h-9 w-[180px] border-border bg-background text-foreground">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
                <SelectItem value="current-quarter">Current Quarter</SelectItem>
                <SelectItem value="year-to-date">Year to Date</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-9 justify-start border-border bg-background text-left font-normal text-foreground hover:bg-accent hover:text-accent-foreground',
                      !customDateRange?.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    {customDateRange?.from ? (
                      customDateRange.to ? (
                        <>{format(customDateRange.from, 'LLL dd, y')} - {format(customDateRange.to, 'LLL dd, y')}</>
                      ) : (
                        format(customDateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto bg-popover p-0 text-popover-foreground" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from ?? new Date()}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">{selectedRangeLabel}</span>
          </div>
        </div>

        <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">On Books</p>
              <p className="text-2xl font-bold text-foreground">{periodMetrics.activeListings}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Valuations</p>
              <p className="text-2xl font-bold text-foreground">{periodMetrics.valuations}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Exchanged</p>
              <p className="text-2xl font-bold text-foreground">{periodMetrics.exchanges}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Revenue Booked</p>
              <p className="text-2xl font-bold text-success">{formatCurrencyCompact(periodMetrics.revenue)}</p>
            </div>
          </div>
          {(loadingPerformance || loadingAppraisal) && (
            <p className="mt-3 text-xs text-muted-foreground">
              {loadingPerformance ? 'Loading live staff performance...' : 'Loading latest appraisal targets...'}
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 bg-background px-6 py-3">
              <TabsList className="h-auto gap-2 border-0 bg-transparent p-0">
                <TabsTrigger value="overview" className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none">Overview</TabsTrigger>
                <TabsTrigger value="performance" className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none">Performance</TabsTrigger>
                <TabsTrigger value="targets" className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none">Targets</TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <Card className="bg-card text-card-foreground">
                  <CardHeader><CardTitle className="text-foreground">6-Month Performance Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={overviewTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                        <YAxis yAxisId="counts" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <YAxis yAxisId="revenue" orientation="right" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrencyCompact(Number(value))} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value, name) => name === 'Revenue' ? formatCurrencyFull(Number(value)) : Number(value).toLocaleString()}
                        />
                        <Legend />
                        <Bar yAxisId="counts" dataKey="valuations" fill="#FFB800" name="Valuations" radius={[6, 6, 0, 0]} />
                        <Line yAxisId="counts" type="monotone" dataKey="deals" stroke="#4169E1" strokeWidth={3} name="Deals" />
                        <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#2E8B57" strokeWidth={3} name="Revenue" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-sm text-muted-foreground">On Books This Period</p><p className="mt-2 text-3xl font-bold text-foreground">{periodMetrics.activeListings}</p></CardContent></Card>
                  <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Valuations This Period</p><p className="mt-2 text-3xl font-bold text-foreground">{periodMetrics.valuations}</p></CardContent></Card>
                  <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Exchanged This Period</p><p className="mt-2 text-3xl font-bold text-foreground">{periodMetrics.exchanges}</p></CardContent></Card>
                  <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Revenue This Period</p><p className="mt-2 text-3xl font-bold text-success">{formatCurrencyCompact(periodMetrics.revenue)}</p></CardContent></Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="mt-0 space-y-6">
                <Card className="bg-card text-card-foreground">
                  <CardHeader><CardTitle className="text-foreground">Selected Period Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={performanceBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                        <YAxis yAxisId="counts" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <YAxis yAxisId="revenue" orientation="right" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrencyCompact(Number(value))} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value, name) => name === 'Revenue' ? formatCurrencyFull(Number(value)) : Number(value).toLocaleString()}
                        />
                        <Legend />
                        <Bar yAxisId="counts" dataKey="valuations" fill="#FFB800" name="Valuations" radius={[6, 6, 0, 0]} />
                        <Bar yAxisId="counts" dataKey="deals" fill="#4169E1" name="Deals Closed" radius={[6, 6, 0, 0]} />
                        <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#2E8B57" strokeWidth={3} name="Revenue" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-border bg-card">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Performance Source</p>
                      <p className="mt-2 text-base font-semibold text-foreground">Live movements database</p>
                      <p className="mt-1 text-sm text-muted-foreground">Showing {staffMovements.length.toLocaleString()} staff-linked movement records for {staff.name}.</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-card">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Current Filter Window</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{selectedRangeLabel}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Breakdown updates when the selected staff or period changes.</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="targets" className="mt-0 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TargetMetricCard title="Deals Target" actual={periodMetrics.deals} target={targets.deals} icon={<TargetIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />} />
                  <TargetMetricCard title="Revenue Target" actual={periodMetrics.revenue} target={targets.revenue} icon={<PoundSterlingIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />} formatter={formatCurrencyCompact} />
                  <TargetMetricCard title="Valuation Target" actual={periodMetrics.valuations} target={targets.valuations} icon={<TargetIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />} />
                  <TargetMetricCard title="Conversion Target" actual={periodMetrics.conversionRate} target={targets.conversionRate} icon={<TargetIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />} formatter={(value) => `${value}%`} />
                </div>

                <Card className="border-border bg-card">
                  <CardHeader><CardTitle className="text-foreground">Latest Appraisal Feedback</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Target Source</p><p className="mt-1 text-sm font-medium text-foreground">{targets.sourceLabel ?? 'No saved appraisal found'}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Completed By</p><p className="mt-1 text-sm font-medium text-foreground">{targets.completedBy ?? 'Not available'}</p></div>
                      <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Last Updated</p><p className="mt-1 text-sm font-medium text-foreground">{targets.updatedAt ? format(new Date(targets.updatedAt), 'dd MMM yyyy, HH:mm') : 'Not available'}</p></div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-sm leading-6 text-foreground">{targets.feedback || 'No feedback has been saved for this staff member yet.'}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <StaffAppraisalDialog
          open={appraisalOpen}
          onOpenChange={setAppraisalOpen}
          staffName={staff.name}
          staffBranch={staff.branch}
          onSave={handleSaveAppraisal}
          agencyId={effectiveAgencyId}
          initialStaffId={staff.id}
          initialYear={format(selectedWindow.to, 'yyyy')}
          initialMonth={sameMonthSelection ? format(selectedWindow.to, 'MMMM') : 'all'}
        />

        <EditStaffDialog
          open={editStaffOpen}
          onOpenChange={setEditStaffOpen}
          staff={staff}
          onSave={handleSaveStaff}
          branches={[]}
          availableModules={availableModules}
          canEditModules={canEditModules}
          canEditProspectorDashboard={canEditProspectorDashboard}
        />
      </div>
    </div>
  );
}
