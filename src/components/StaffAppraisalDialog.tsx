import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheckIcon, SaveIcon, XIcon, DownloadIcon, HistoryIcon, AlertCircleIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchStaffMembers, StaffMemberRow } from '@/lib/ownerApi';
import { notifyError } from '@/lib/notify';
import { fetchLatestStaffAppraisal, type StaffAppraisalPayload } from '@/lib/housekeepingApi';
import { useAuthStore } from '@/stores/authStore';

interface StaffAppraisalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  staffBranch: string;
  onSave: (data: StaffAppraisalPayload) => void;
  agencyId?: string;
  onStaffSelected?: (name: string, branch: string) => void;
  readOnly?: boolean;
  initialStaffId?: string;
  initialYear?: string;
  initialMonth?: string;
}

interface AppraisalRow {
  id: string;
  category: string;
  metric: string;
  monthlyData: { target: string; actual: string }[];
  weeklyData?: { target: string; actual: string }[]; // 5 weeks per month
}

type ViewMode = 'monthly' | 'weekly';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthSelectOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
const defaultMonthValue = monthSelectOptions[new Date().getMonth()];

const initialAppraisalData: AppraisalRow[] = [
  { 
    id: '1', 
    category: 'STATISTICS', 
    metric: 'Appointments to view', 
    monthlyData: [
      { target: '20', actual: '25' }, // Exceeded Target (Green)
      { target: '25', actual: '18' }, // Missed Target (Red)
      { target: '30', actual: '30' }, // Met Target (Green)
      { target: '35', actual: '' },   // Pending
      ...Array(8).fill({ target: '', actual: '' })
    ], 
    weeklyData: Array(5).fill({ target: '', actual: '' }) 
  },
  { id: '2', category: 'STATISTICS', metric: 'Valuations in diary', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '3', category: 'STATISTICS', metric: 'ILS Enquiries', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '4', category: 'STATISTICS', metric: 'ILS Appointments', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '5', category: 'STATISTICS', metric: 'Applicants registered', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '6', category: 'RESERVATIONS', metric: 'NEW RESERVATIONS', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '7', category: 'RESERVATIONS', metric: 'SEC HAND RESERVAT', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '8', category: 'RESERVATIONS', metric: 'SEC HAND RESERVA C', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '9', category: 'RESERVATIONS', metric: 'VAL REFERRALS', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '10', category: 'RESERVATIONS', metric: 'ILS sign-ups', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '11', category: 'INSTRUCTIONS', metric: 'Valuations attended', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '12', category: 'INSTRUCTIONS', metric: 'Instructions', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '13', category: 'INSTRUCTIONS', metric: 'Ave fee % / Ave fee £', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '14', category: 'INSTRUCTIONS', metric: 'Boards', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '15', category: 'COMPLETIONS', metric: 'Second hand contracts', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '16', category: 'COMPLETIONS', metric: 'New contracts res H', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '17', category: 'COMPLETIONS', metric: 'Cumulative total comN', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: '18', category: 'COMPLETIONS', metric: 'TOTAL COMM DUE', monthlyData: Array(12).fill({ target: '', actual: '' }), weeklyData: Array(5).fill({ target: '', actual: '' }) },
];

const initialWeeklyAppraisalData: AppraisalRow[] = [
  { id: 'w1', category: 'Weekly', metric: 'Viewings', monthlyData: [], weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: 'w2', category: 'Weekly', metric: 'Valuations', monthlyData: [], weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: 'w3', category: 'Weekly', metric: 'Sales', monthlyData: [], weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: 'w4', category: 'Weekly', metric: 'FS enquiries', monthlyData: [], weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: 'w5', category: 'Weekly', metric: 'Instructions', monthlyData: [], weeklyData: Array(5).fill({ target: '', actual: '' }) },
  { id: 'w6', category: 'Weekly', metric: 'Action points for week ahead', monthlyData: [], weeklyData: Array(5).fill({ target: '', actual: '' }) },
];

const clonePeriodData = (items: { target: string; actual: string }[]) =>
  items.map((item) => ({
    target: item?.target ?? '',
    actual: item?.actual ?? '',
  }));

const cloneAppraisalRows = (rows: AppraisalRow[]) =>
  rows.map((row) => ({
    ...row,
    monthlyData: clonePeriodData(row.monthlyData ?? []),
    weeklyData: clonePeriodData(row.weeklyData ?? []),
  }));

const createInitialMonthlyAppraisalData = () => cloneAppraisalRows(initialAppraisalData);
const createInitialWeeklyAppraisalData = () => cloneAppraisalRows(initialWeeklyAppraisalData);

const normalizeComparableValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

const normalizeMonthValue = (value?: string | null) => {
  if (!value) return defaultMonthValue;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultMonthValue;
  if (normalized === 'all' || normalized === 'all months') return 'all';

  return (
    monthSelectOptions.find((monthOption) => {
      const monthKey = monthOption.toLowerCase();
      return monthKey === normalized || monthKey.slice(0, 3) === normalized.slice(0, 3);
    }) ?? defaultMonthValue
  );
};

const parseMetricValue = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMonthlyTotal = (row: AppraisalRow, monthIndexes: number[]) => {
  const totals = monthIndexes.reduce(
    (acc, period) => {
      const monthData = row.monthlyData[period];
      const target = parseMetricValue(monthData?.target ?? '');
      const actual = parseMetricValue(monthData?.actual ?? '');
      if (target !== null) {
        acc.target += target;
        acc.hasTarget = true;
      }
      if (actual !== null) {
        acc.actual += actual;
        acc.hasActual = true;
      }
      return acc;
    },
    { target: 0, actual: 0, hasTarget: false, hasActual: false }
  );

  if (!totals.hasTarget && !totals.hasActual) {
    return '-';
  }

  const actualLabel = totals.hasActual ? totals.actual.toLocaleString() : '-';
  const targetLabel = totals.hasTarget ? totals.target.toLocaleString() : '-';
  return `${actualLabel} / ${targetLabel}`;
};

const getVisibleMonthIndexes = (selectedMonth: string) => {
  if (selectedMonth === 'all') {
    return monthSelectOptions.map((_, index) => index);
  }

  const monthIndex = monthSelectOptions.findIndex((monthOption) => monthOption === selectedMonth);
  return monthIndex >= 0 ? [monthIndex] : [new Date().getMonth()];
};

export function StaffAppraisalDialog({
  open,
  onOpenChange,
  staffName,
  staffBranch,
  onSave,
  agencyId,
  onStaffSelected,
  readOnly = false,
  initialStaffId,
  initialYear,
  initialMonth,
}: StaffAppraisalDialogProps) {
  const user = useAuthStore((state) => state.user);
  const [staffList, setStaffList] = useState<StaffMemberRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(initialStaffId || '');
  const [year, setYear] = useState(initialYear ?? String(new Date().getFullYear()));
  const [month, setMonth] = useState(normalizeMonthValue(initialMonth));
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [monthlyAppraisalData, setMonthlyAppraisalData] = useState<AppraisalRow[]>(
    createInitialMonthlyAppraisalData()
  );
  const [weeklyAppraisalData, setWeeklyAppraisalData] = useState<AppraisalRow[]>(
    createInitialWeeklyAppraisalData()
  );
  const [notes, setNotes] = useState('');
  const [loadedRequestId, setLoadedRequestId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const selectedStaff = staffList.find((staff) => staff.id === selectedStaffId);
  const effectiveStaffName = selectedStaff?.name ?? staffName;
  const effectiveStaffBranch = selectedStaff?.branch_name ?? staffBranch;
  const shouldShowStaffSelector = !!agencyId && !initialStaffId;
  const visibleMonthIndexes = getVisibleMonthIndexes(month);
  const visibleMonthColumns = visibleMonthIndexes.map((monthIndex) => ({
    index: monthIndex,
    shortLabel: months[monthIndex],
    fullLabel: monthSelectOptions[monthIndex],
  }));
  const completedBy =
    (user?.user_metadata as any)?.name ??
    (user?.user_metadata as any)?.full_name ??
    (user?.app_metadata as any)?.name ??
    user?.email ??
    'Current User';

  // Load staff members when dialog opens
  useEffect(() => {
    const loadStaff = async () => {
      if (!open || !agencyId) return;
      setLoadingStaff(true);
      const staff = await fetchStaffMembers(agencyId);
      setStaffList(staff);
      setLoadingStaff(false);
    };
    void loadStaff();
  }, [open, agencyId]);

  useEffect(() => {
    if (!open) return;
    setYear(initialYear ?? String(new Date().getFullYear()));
    setMonth(normalizeMonthValue(initialMonth));
  }, [open, initialYear, initialMonth]);

  useEffect(() => {
    if (!open) return;
    if (initialStaffId) {
      setSelectedStaffId(initialStaffId);
      return;
    }
    if (!staffName || staffList.length === 0) return;
    const normalizedStaffName = normalizeComparableValue(staffName);
    const match = staffList.find(
      (staff) => normalizeComparableValue(staff.name) === normalizedStaffName
    );
    if (match) {
      setSelectedStaffId(match.id);
    }
  }, [open, initialStaffId, staffName, staffList]);

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    const staff = staffList.find(s => s.id === staffId);
    if (staff && onStaffSelected) {
      onStaffSelected(staff.name, staff.branch_name ?? 'Unassigned');
    }
  };

  const currentData = viewMode === 'monthly' ? monthlyAppraisalData : weeklyAppraisalData;

  useEffect(() => {
    if (!open) return;

    const loadExistingAppraisal = async () => {
      if (!agencyId || !effectiveStaffName) {
        setLoadedRequestId(null);
        setMonthlyAppraisalData(createInitialMonthlyAppraisalData());
        setWeeklyAppraisalData(createInitialWeeklyAppraisalData());
        setNotes('');
        return;
      }

      setLoadingExisting(true);
      const appraisal = await fetchLatestStaffAppraisal({
        agencyId,
        staffId: selectedStaffId || undefined,
        staffName: effectiveStaffName,
        year,
        month,
      });

      if (appraisal?.payload) {
        setLoadedRequestId(appraisal.id);
        setMonthlyAppraisalData(
          cloneAppraisalRows(
            (appraisal.payload.monthlyData as AppraisalRow[] | undefined) ?? createInitialMonthlyAppraisalData()
          )
        );
        setWeeklyAppraisalData(
          cloneAppraisalRows(
            (appraisal.payload.weeklyData as AppraisalRow[] | undefined) ?? createInitialWeeklyAppraisalData()
          )
        );
        setNotes(appraisal.payload.notes ?? '');
      } else {
        setLoadedRequestId(null);
        setMonthlyAppraisalData(createInitialMonthlyAppraisalData());
        setWeeklyAppraisalData(createInitialWeeklyAppraisalData());
        setNotes('');
      }

      setLoadingExisting(false);
    };

    void loadExistingAppraisal();
  }, [open, agencyId, effectiveStaffName, selectedStaffId, year, month]);

  const handleCellChange = (rowId: string, index: number, field: 'target' | 'actual', value: string) => {
    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;
    
    setData(prev => prev.map(row => {
      if (row.id === rowId) {
        if (viewMode === 'monthly') {
          const newMonthlyData = [...row.monthlyData];
          newMonthlyData[index] = {
            ...newMonthlyData[index],
            [field]: value
          };
          return { ...row, monthlyData: newMonthlyData };
        } else {
          const newWeeklyData = row.weeklyData ? [...row.weeklyData] : Array(5).fill({ target: '', actual: '' });
          newWeeklyData[index] = {
            ...newWeeklyData[index],
            [field]: value
          };
          return { ...row, weeklyData: newWeeklyData };
        }
      }
      return row;
    }));
  };

  const handleCopyTargetToNext = (rowId: string, index: number) => {
    const maxIndex = viewMode === 'monthly' ? 11 : 4;
    if (index >= maxIndex) return;

    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;

    setData(prev => prev.map(row => {
      if (row.id === rowId) {
        if (viewMode === 'monthly') {
          const newMonthlyData = [...row.monthlyData];
          const currentTarget = newMonthlyData[index].target;
          newMonthlyData[index + 1] = {
            ...newMonthlyData[index + 1],
            target: currentTarget
          };
          return { ...row, monthlyData: newMonthlyData };
        } else {
          const newWeeklyData = row.weeklyData ? [...row.weeklyData] : Array(5).fill({ target: '', actual: '' });
          const currentTarget = newWeeklyData[index].target;
          newWeeklyData[index + 1] = {
            ...newWeeklyData[index + 1],
            target: currentTarget
          };
          return { ...row, weeklyData: newWeeklyData };
        }
      }
      return row;
    }));
  };

  const handleMetricChange = (rowId: string, newMetric: string) => {
    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;
    setData(prev => prev.map(row => 
      row.id === rowId ? { ...row, metric: newMetric } : row
    ));
  };

  const handleCategoryChange = (oldCategory: string, newCategory: string) => {
    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;
    setData(prev => prev.map(row => 
      row.category === oldCategory ? { ...row, category: newCategory } : row
    ));
  };

  const handleAddRowToCategory = (category: string) => {
    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;
    const currentList = viewMode === 'monthly' ? monthlyAppraisalData : weeklyAppraisalData;
    
    // Find the last index of this category
    let insertIndex = currentList.length;
    for (let i = currentList.length - 1; i >= 0; i--) {
      if (currentList[i].category === category) {
        insertIndex = i + 1;
        break;
      }
    }

    const newRow: AppraisalRow = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: category,
      metric: 'New Metric',
      monthlyData: Array(12).fill({ target: '', actual: '' }),
      weeklyData: Array(5).fill({ target: '', actual: '' })
    };

    const newList = [...currentList];
    newList.splice(insertIndex, 0, newRow);
    setData(newList);
  };

  const handleAddCategory = () => {
    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;
    const currentList = viewMode === 'monthly' ? monthlyAppraisalData : weeklyAppraisalData;
    
    const newRow: AppraisalRow = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: 'New Category',
      metric: 'New Metric',
      monthlyData: Array(12).fill({ target: '', actual: '' }),
      weeklyData: Array(5).fill({ target: '', actual: '' })
    };

    setData([...currentList, newRow]);
  };

  const handleDeleteRow = (rowId: string) => {
    const setData = viewMode === 'monthly' ? setMonthlyAppraisalData : setWeeklyAppraisalData;
    setData(prev => prev.filter(row => row.id !== rowId));
  };

  const handleSave = () => {
    if (!effectiveStaffName) {
      notifyError('Please select a staff member before saving.');
      return;
    }

    const appraisalRecord = {
      requestId: loadedRequestId ?? undefined,
      staffId: selectedStaff?.id ?? selectedStaffId ?? null,
      staffEmail: selectedStaff?.email ?? null,
      staffName: effectiveStaffName,
      staffBranch: effectiveStaffBranch || 'Unassigned',
      year,
      month,
      monthlyData: monthlyAppraisalData,
      weeklyData: weeklyAppraisalData,
      notes,
      completedBy,
      completedAt: new Date().toISOString(),
    };

    onSave(appraisalRecord);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full sm:h-[95vh] sm:max-w-[95vw] sm:max-h-[95vh] bg-card text-card-foreground p-0 flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <DialogTitle className="text-foreground text-xl sm:text-2xl flex items-center gap-2">
                <ClipboardCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" strokeWidth={1.5} />
                <span className="truncate">Staff Appraisal{effectiveStaffName ? ` - ${effectiveStaffName}` : ''}</span>
              </DialogTitle>
              {/* Staff selector */}
              {shouldShowStaffSelector && (
                <div className="mt-2">
                  <Select value={selectedStaffId} onValueChange={handleStaffChange} disabled={readOnly}>
                    <SelectTrigger className="w-[260px] h-9 bg-background text-foreground border-border text-xs sm:text-sm">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      {loadingStaff ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading staff...</div>
                      ) : staffList.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No staff members found</div>
                      ) : (
                        staffList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} — {s.branch_name ?? 'Unassigned'}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                Branch: {effectiveStaffBranch || 'Not selected'} • Year: {year} • {month === 'all' ? 'All Months' : month}
              </p>
              {loadingExisting ? (
                <p className="mt-1 text-xs text-muted-foreground">Loading saved appraisal data...</p>
              ) : loadedRequestId ? (
                <p className="mt-1 text-xs text-muted-foreground">Loaded from saved appraisal records.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 pr-8 sm:pr-10">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg shrink-0">
                <Button
                  variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('monthly')}
                  className="h-8 px-3 text-xs"
                  disabled={loadingExisting}
                >
                  Monthly
                </Button>
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                  className="h-8 px-3 text-xs"
                  disabled={loadingExisting}
                >
                  Weekly
                </Button>
              </div>
              <Select value={month} onValueChange={setMonth} disabled={loadingExisting}>
                <SelectTrigger className="w-[130px] h-9 bg-background text-foreground border-border text-xs sm:text-sm">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All Months</SelectItem>
                  {monthSelectOptions.map((monthOption) => (
                    <SelectItem key={monthOption} value={monthOption}>
                      {monthOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-20 h-9 bg-background text-xs sm:text-sm"
                placeholder="Year"
                disabled={loadingExisting}
              />
              <Button variant="outline" size="sm" className="gap-2 h-9 px-3">
                <DownloadIcon className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
          <div className="overflow-x-auto pb-4">
            <table
              className={cn(
                'w-full border-collapse text-sm',
                viewMode === 'monthly'
                  ? month === 'all'
                    ? 'min-w-[1980px]'
                    : 'min-w-[560px]'
                  : 'min-w-[980px]'
              )}
            >
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  {viewMode === 'monthly' && (
                    <th className="border border-border p-2 text-left font-semibold bg-muted min-w-[150px]">Category</th>
                  )}
                  <th className="border border-border p-2 text-left font-semibold bg-muted min-w-[200px]">
                    {viewMode === 'monthly' ? 'Metric' : 'Subject'}
                  </th>
                  {viewMode === 'monthly' ? (
                    <>
                      {visibleMonthColumns.map((monthColumn) => (
                        <th key={monthColumn.fullLabel} colSpan={2} className="border border-border p-2 text-center font-semibold bg-muted min-w-[112px]">
                          {monthColumn.shortLabel}
                        </th>
                      ))}
                      <th className="border border-border p-2 text-center font-semibold bg-muted min-w-[120px]">
                        {month === 'all' ? 'Year Total' : `${month} Total`}
                      </th>
                    </>
                  ) : (
                    <>
                      {weeks.map((week, idx) => (
                        <th key={week} colSpan={2} className="border border-border p-2 text-center font-semibold bg-muted min-w-[112px]">
                          {idx + 1}
                        </th>
                      ))}
                    </>
                  )}
                  <th rowSpan={2} className="border border-border bg-muted w-10 min-w-[40px]"></th>
                </tr>
                <tr>
                  {viewMode === 'monthly' && <th className="border border-border p-1 bg-muted/50"></th>}
                  <th className="border border-border p-1 bg-muted/50"></th>
                  {(viewMode === 'monthly' ? visibleMonthColumns : weeks).map((period) => (
                    <React.Fragment key={viewMode === 'monthly' ? period.fullLabel : period}>
                      <th className="border border-border p-1 text-center text-xs bg-blue-100 dark:bg-blue-900/30 font-semibold w-14 min-w-[56px]">T</th>
                      <th className="border border-border p-1 text-center text-xs bg-green-100 dark:bg-green-900/30 font-semibold w-14 min-w-[56px]">A</th>
                    </React.Fragment>
                  ))}
                  {viewMode === 'monthly' && <th className="border border-border p-1 bg-muted/50"></th>}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, rowIndex) => {
                  const isNewCategory = rowIndex === 0 || currentData[rowIndex - 1].category !== row.category;
                  const dataArray = viewMode === 'monthly' ? row.monthlyData : (row.weeklyData || Array(5).fill({ target: '', actual: '' }));
                  const visibleDataEntries =
                    viewMode === 'monthly'
                      ? visibleMonthIndexes.map((monthIndex) => ({
                          sourceIndex: monthIndex,
                          data: dataArray[monthIndex] ?? { target: '', actual: '' },
                        }))
                      : dataArray.map((periodData, index) => ({
                          sourceIndex: index,
                          data: periodData,
                        }));
                  
                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors group/row">
                      {viewMode === 'monthly' && isNewCategory && (
                        <td 
                          rowSpan={currentData.filter(r => r.category === row.category).length}
                          className="border border-border p-2 font-semibold bg-muted/50 align-top relative group/category"
                        >
                          <div className="flex flex-col h-full">
                            <Input
                              value={row.category}
                              onChange={(e) => handleCategoryChange(row.category, e.target.value)}
                              className="border-0 bg-transparent font-semibold p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                              readOnly={readOnly}
                            />
                            {!readOnly ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-6 text-[10px] text-muted-foreground hover:text-primary w-full justify-start px-1"
                                onClick={() => handleAddRowToCategory(row.category)}
                                title="Add another metric to this category"
                              >
                                <PlusIcon className="h-3 w-3 mr-1" /> Add Metric
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      )}
                      <td className="border border-border p-0 min-w-[220px]">
                        <Input
                          value={row.metric}
                          onChange={(e) => handleMetricChange(row.id, e.target.value)}
                          className="border-0 h-full text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2"
                          readOnly={readOnly || viewMode === 'weekly'} // Make subject read-only in weekly view to match template
                        />
                      </td>
                      {visibleDataEntries.map(({ sourceIndex, data }, visibleIndex) => (
                        <React.Fragment key={`${row.id}-${sourceIndex}`}>
                          <td className="border border-border p-0 relative group/cell w-14 min-w-[56px]">
                            <Input
                              value={data.target}
                              onChange={(e) => handleCellChange(row.id, sourceIndex, 'target', e.target.value)}
                              className="border-0 h-9 text-center bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm px-1 pr-6 min-w-[56px]"
                              placeholder=""
                              readOnly={readOnly}
                            />
                            {!readOnly && visibleIndex < visibleDataEntries.length - 1 && data.target && (
                              <button
                                onClick={() => handleCopyTargetToNext(row.id, sourceIndex)}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 text-blue-600 hover:text-blue-700 transition-opacity p-0.5 bg-white dark:bg-slate-800 rounded shadow-sm"
                                title={`Copy target to next ${viewMode === 'monthly' ? 'month' : 'week'}`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                          </td>
                          <td className="border border-border p-0 w-14 min-w-[56px]">
                            <Input
                              value={data.actual}
                              onChange={(e) => handleCellChange(row.id, sourceIndex, 'actual', e.target.value)}
                              className={cn(
                                "border-0 h-9 text-center bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm transition-colors px-1 min-w-[56px]",
                                (() => {
                                  const t = parseFloat(data.target);
                                  const a = parseFloat(data.actual);
                                  if (!isNaN(t) && !isNaN(a)) {
                                    return a >= t 
                                      ? "text-green-600 font-bold bg-green-50/50 dark:bg-green-900/20" 
                                      : "text-red-600 font-bold bg-red-50/50 dark:bg-red-900/20";
                                  }
                                  return "";
                                })()
                              )}
                              placeholder=""
                              readOnly={readOnly}
                            />
                          </td>
                        </React.Fragment>
                      ))}
                      {viewMode === 'monthly' && (
                        <td className="border border-border p-2 text-center font-semibold bg-muted/50 min-w-[120px] text-xs sm:text-sm">
                          {formatMonthlyTotal(row, visibleMonthIndexes)}
                        </td>
                      )}
                      <td className="border border-border p-0 text-center">
                        {!readOnly ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRow(row.id)}
                            title="Delete metric"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!readOnly ? (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddCategory}
                  className="w-full border-dashed border-2"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add New Category
                </Button>
              </div>
            ) : null}
          </div>

          {/* Notes Section */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="appraisal-notes" className="text-foreground font-semibold">Manager's Comments & Feedback</Label>
            <Textarea
              id="appraisal-notes"
              placeholder="Provide detailed feedback, areas for improvement, strengths, and development goals..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background text-foreground min-h-[100px]"
              readOnly={readOnly}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly ? (
            <Button
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <SaveIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Save Appraisal
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
