import React, { useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, XIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';

interface StaffSummaryData {
  id?: string;
  label: string;
  type: 'number' | 'currency' | 'percentage';
  months: { [key: string]: number | string };
  total: number | string;
  isCustom?: boolean;
}

interface CellRating {
  rowLabel: string;
  month: string;
  rating: 'red' | 'yellow' | 'green' | null;
}

interface ManualCellValue {
  rowLabel: string;
  month: string;
  value: number;
}

interface EditingCell {
  rowLabel: string;
  month: string;
  type: 'number' | 'currency' | 'percentage';
  currentValue: number;
}

interface CustomRowDefinition {
  id: string;
  label: string;
  type: 'number' | 'currency' | 'percentage';
}

interface MonthlyStaffMetrics {
  month: string;
  instructions: number;
  sales: number;
  salesValue: number;
  lettings: number;
  lettingsValue: number;
  exchanges: number;
  exchangesValue: number;
  completions: number;
  completionsValue: number;
  aborts: number;
  abortsValue: number;
  totalRevenue: number;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildEmptyMonthlyMetrics = (): MonthlyStaffMetrics[] =>
  months.map((month) => ({
    month,
    instructions: 0,
    sales: 0,
    salesValue: 0,
    lettings: 0,
    lettingsValue: 0,
    exchanges: 0,
    exchangesValue: 0,
    completions: 0,
    completionsValue: 0,
    aborts: 0,
    abortsValue: 0,
    totalRevenue: 0,
  }));

interface StaffPerformanceSummaryViewProps {
  initialSelectedStaffId: string | null;
  agencyId?: string;
}

export function StaffPerformanceSummaryView({ initialSelectedStaffId, agencyId }: StaffPerformanceSummaryViewProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(() => String(currentYear));
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(initialSelectedStaffId ?? 'all');
  const [cellRatings, setCellRatings] = useState<CellRating[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyStaffMetrics[]>(() => buildEmptyMonthlyMetrics());
  const [loading, setLoading] = useState(false);
  const [customRows, setCustomRows] = useState<CustomRowDefinition[]>([]);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [newRowLabel, setNewRowLabel] = useState('');
  const [newRowType, setNewRowType] = useState<'number' | 'currency' | 'percentage'>('number');
  const [addRowError, setAddRowError] = useState<string | null>(null);
  const [manualValues, setManualValues] = useState<ManualCellValue[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editInputValue, setEditInputValue] = useState<string>('');

  const yearOptions = useMemo(() => {
    const options = Array.from({ length: 6 }, (_, index) => String(currentYear - index));
    if (!options.includes(selectedYear)) options.push(selectedYear);
    return options.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
  }, [currentYear, selectedYear]);

  useEffect(() => {
    setSelectedStaffId(initialSelectedStaffId ?? 'all');
  }, [initialSelectedStaffId]);

  useEffect(() => {
    if (!agencyId) {
      setStaffList([]);
      setMonthlyMetrics(buildEmptyMonthlyMetrics());
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const parsedYear = Number.parseInt(selectedYear, 10);
      const year = Number.isNaN(parsedYear) ? currentYear : parsedYear;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      try {
        const [staffRowsResult, clientStaffRowsResult, movementsResult] = await Promise.all([
          supabase
            .from('staff_members')
            .select('id, name')
            .eq('agency_id', agencyId)
            .order('name', { ascending: true }),
          supabase
            .from('client_staff')
            .select('id, name, clients!inner(agency_id)')
            .eq('clients.agency_id', agencyId)
            .order('name', { ascending: true }),
          supabase
            .from('movements')
            .select('agent, type, status, price, fee_amount, date')
            .eq('agency_id', agencyId)
            .gte('date', startDate)
            .lte('date', endDate),
        ]);

        if (staffRowsResult.error) {
          console.error('[StaffPerformanceSummaryView] Error loading staff_members:', staffRowsResult.error);
        }
        if (clientStaffRowsResult.error) {
          console.error('[StaffPerformanceSummaryView] Error loading client_staff:', clientStaffRowsResult.error);
        }
        if (movementsResult.error) {
          console.error('[StaffPerformanceSummaryView] Error loading movements:', movementsResult.error);
        }

        const mergedStaffMap = new Map<string, { id: string; name: string }>();
        for (const row of (staffRowsResult.data ?? []) as Array<{ id: string; name: string }>) {
          if (!row?.id || !row?.name) continue;
          mergedStaffMap.set(row.id, { id: row.id, name: row.name });
        }
        for (const row of (clientStaffRowsResult.data ?? []) as Array<{ id: string; name: string }>) {
          if (!row?.id || !row?.name) continue;
          if (!mergedStaffMap.has(row.id)) {
            mergedStaffMap.set(row.id, { id: row.id, name: row.name });
          }
        }

        const mergedStaff = Array.from(mergedStaffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setStaffList(mergedStaff);

        const selectedStaffName =
          selectedStaffId && selectedStaffId !== 'all'
            ? mergedStaff.find((staff) => staff.id === selectedStaffId)?.name ?? null
            : null;

        const allMovements = (movementsResult.data ?? []) as Array<{
          agent: string | null;
          type: string | null;
          status: string | null;
          price: number | null;
          fee_amount: number | null;
          date: string | null;
        }>;

        const filteredMovements = selectedStaffName
          ? allMovements.filter((movement) => normalizeText(movement.agent) === normalizeText(selectedStaffName))
          : allMovements;

        const nextMetrics = buildEmptyMonthlyMetrics();
        for (const movement of filteredMovements) {
          if (!movement.date) continue;
          const movementDate = new Date(movement.date);
          if (Number.isNaN(movementDate.getTime())) continue;

          const monthIndex = movementDate.getMonth();
          if (monthIndex < 0 || monthIndex > 11) continue;

          const status = normalizeText(movement.status);
          const type = normalizeText(movement.type);
          const price = toFiniteNumber(movement.price);
          const feeAmount = toFiniteNumber(movement.fee_amount);
          const monthBucket = nextMetrics[monthIndex];

          monthBucket.totalRevenue += feeAmount;

          if (type === 'sale') {
            monthBucket.sales += 1;
            monthBucket.salesValue += price;
          } else if (type === 'letting') {
            monthBucket.lettings += 1;
            monthBucket.lettingsValue += price;
          }

          if (status === 'exchanged') {
            monthBucket.exchanges += 1;
            monthBucket.exchangesValue += price;
          } else if (status === 'completed') {
            monthBucket.completions += 1;
            monthBucket.completionsValue += price;
          } else if (status === 'abort' || status === 'withdrawn') {
            monthBucket.aborts += 1;
            monthBucket.abortsValue += price;
          } else if (status === 'on-books' || status === 'on-books-status' || status === 'valuation') {
            monthBucket.instructions += 1;
          }
        }

        setMonthlyMetrics(nextMetrics);
      } catch (error) {
        console.error('[StaffPerformanceSummaryView] Unexpected error loading data:', error);
        setStaffList([]);
        setMonthlyMetrics(buildEmptyMonthlyMetrics());
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [agencyId, selectedYear, selectedStaffId, currentYear]);

  useEffect(() => {
    if (selectedStaffId && selectedStaffId !== 'all' && !staffList.some((staff) => staff.id === selectedStaffId)) {
      setSelectedStaffId('all');
    }
  }, [selectedStaffId, staffList]);

  const summaryData = useMemo(() => {
    const parsedYear = Number.parseInt(selectedYear, 10);
    const year = Number.isNaN(parsedYear) ? currentYear : parsedYear;
    const selectedStaffName =
      selectedStaffId === 'all' || !selectedStaffId
        ? 'Overall Staff'
        : staffList.find((staff) => staff.id === selectedStaffId)?.name ?? 'Overall Staff';

    const buildRow = (
      label: string,
      type: 'number' | 'currency' | 'percentage',
      getValue: (metric: MonthlyStaffMetrics) => number
    ): StaffSummaryData => {
      const monthValues: { [key: string]: number } = {};
      let total = 0;
      let count = 0;

      for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
        const monthName = months[monthIndex];
        const value = getValue(monthlyMetrics[monthIndex] ?? buildEmptyMonthlyMetrics()[monthIndex]);
        monthValues[monthName] = value;
        total += value;
        if (type === 'percentage' && value > 0) count++;
      }

      return {
        label,
        type,
        months: monthValues,
        total: type === 'percentage' && count > 0 ? total / count : total,
      };
    };

    return {
      staffName: selectedStaffName,
      year,
      months,
      data: [
        buildRow('Instructions', 'number', (metric) => metric.instructions),
        buildRow('Sales', 'number', (metric) => metric.sales),
        buildRow('Total Value of Sales', 'currency', (metric) => metric.salesValue),
        buildRow('Lets Agreed', 'number', (metric) => metric.lettings),
        buildRow('Lets Agreed \u00A3', 'currency', (metric) => metric.lettingsValue),
        buildRow('Exchanges', 'number', (metric) => metric.exchanges),
        buildRow('Total Value of Exchanges', 'currency', (metric) => metric.exchangesValue),
        buildRow('Completions', 'number', (metric) => metric.completions),
        buildRow('Total Value of Completions', 'currency', (metric) => metric.completionsValue),
        buildRow('Total Number of Aborts', 'number', (metric) => metric.aborts),
        buildRow('Total Value of Aborts \u00A3', 'currency', (metric) => metric.abortsValue),
        buildRow('Total Revenue Booked', 'currency', (metric) => metric.totalRevenue),
        ...customRows.map((row) => ({
          id: row.id,
          label: row.label,
          type: row.type,
          months: months.reduce((acc, month) => ({ ...acc, [month]: 0 }), {} as { [key: string]: number }),
          total: 0,
          isCustom: true,
        })),
      ],
    };
  }, [currentYear, customRows, monthlyMetrics, selectedStaffId, selectedYear, staffList]);

  const ratingsStorageKey = `staff-ratings-${selectedStaffId ?? 'all'}-${selectedYear}`;
  const customRowsStorageKey = `staff-custom-rows-${selectedStaffId ?? 'all'}-${selectedYear}`;
  const manualValuesStorageKey = `staff-manual-values-${selectedStaffId ?? 'all'}-${selectedYear}`;

  useEffect(() => {
    if (cellRatings.length > 0) {
      localStorage.setItem(ratingsStorageKey, JSON.stringify(cellRatings));
    }
  }, [cellRatings, ratingsStorageKey]);

  useEffect(() => {
    const savedRatings = localStorage.getItem(ratingsStorageKey);
    if (!savedRatings) {
      setCellRatings([]);
      return;
    }

    try {
      const parsed = JSON.parse(savedRatings) as CellRating[];
      setCellRatings(parsed);
    } catch (error) {
      console.error('Failed to load saved ratings:', error);
      setCellRatings([]);
    }
  }, [ratingsStorageKey]);

  useEffect(() => {
    const savedRows = localStorage.getItem(customRowsStorageKey);
    if (!savedRows) {
      setCustomRows([]);
      return;
    }

    try {
      const parsed = JSON.parse(savedRows) as CustomRowDefinition[];
      const normalizedRows = Array.isArray(parsed)
        ? parsed
            .filter((row) => row && typeof row.label === 'string' && typeof row.type === 'string')
            .map((row) => ({
              id: row.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              label: row.label,
              type: row.type === 'currency' || row.type === 'percentage' ? row.type : 'number',
            }))
        : [];
      setCustomRows(normalizedRows);
    } catch (error) {
      console.error('Failed to load custom rows:', error);
      setCustomRows([]);
    }
  }, [customRowsStorageKey]);

  useEffect(() => {
    if (customRows.length > 0) {
      localStorage.setItem(customRowsStorageKey, JSON.stringify(customRows));
    } else {
      localStorage.removeItem(customRowsStorageKey);
    }
  }, [customRows, customRowsStorageKey]);

  useEffect(() => {
    const savedValues = localStorage.getItem(manualValuesStorageKey);
    if (!savedValues) {
      setManualValues([]);
      return;
    }

    try {
      const parsed = JSON.parse(savedValues) as ManualCellValue[];
      setManualValues(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to load manual values:', error);
      setManualValues([]);
    }
  }, [manualValuesStorageKey]);

  useEffect(() => {
    if (manualValues.length > 0) {
      localStorage.setItem(manualValuesStorageKey, JSON.stringify(manualValues));
    } else {
      localStorage.removeItem(manualValuesStorageKey);
    }
  }, [manualValues, manualValuesStorageKey]);

  const handleAddCustomRow = () => {
    const trimmed = newRowLabel.trim();
    if (!trimmed) {
      setAddRowError('Please enter a metric name.');
      return;
    }

    const normalizedLabel = normalizeText(trimmed);
    const existingLabels = new Set(summaryData.data.map((row) => normalizeText(row.label)));
    if (existingLabels.has(normalizedLabel)) {
      setAddRowError('That metric already exists.');
      return;
    }

    const newRow: CustomRowDefinition = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: trimmed,
      type: newRowType,
    };

    setCustomRows((prev) => [...prev, newRow]);
    setAddRowOpen(false);
    setNewRowLabel('');
    setNewRowType('number');
    setAddRowError(null);
  };

  const handleRemoveCustomRow = (rowId: string) => {
    setCustomRows((prev) => {
      const rowToRemove = prev.find((row) => row.id === rowId);
      if (rowToRemove) {
        setCellRatings((ratings) => ratings.filter((entry) => entry.rowLabel !== rowToRemove.label));
        setManualValues((values) => values.filter((entry) => entry.rowLabel !== rowToRemove.label));
      }
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const getCellValue = (rowLabel: string, month: string, originalValue: number): number => {
    const manualEntry = manualValues.find((entry) => entry.rowLabel === rowLabel && entry.month === month);
    return manualEntry !== undefined ? manualEntry.value : originalValue;
  };

  const handleCellEdit = (
    rowLabel: string,
    month: string,
    type: 'number' | 'currency' | 'percentage',
    currentValue: number
  ) => {
    setEditingCell({ rowLabel, month, type, currentValue });
    setEditInputValue(currentValue.toString());
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    const numValue = parseFloat(editInputValue) || 0;
    setManualValues((prev) => {
      const existing = prev.find((entry) => entry.rowLabel === editingCell.rowLabel && entry.month === editingCell.month);
      if (existing) {
        return prev.map((entry) =>
          entry.rowLabel === editingCell.rowLabel && entry.month === editingCell.month
            ? { ...entry, value: numValue }
            : entry
        );
      }
      return [...prev, { rowLabel: editingCell.rowLabel, month: editingCell.month, value: numValue }];
    });

    setEditingCell(null);
    setEditInputValue('');
  };

  const handleClearOverride = () => {
    if (!editingCell) return;
    setManualValues((prev) => prev.filter((entry) => !(entry.rowLabel === editingCell.rowLabel && entry.month === editingCell.month)));
    setEditingCell(null);
    setEditInputValue('');
  };

  const formatValue = (value: number | string, type: 'number' | 'currency' | 'percentage') => {
    if (typeof value === 'string') return value;
    if (value === 0 && type === 'currency') return '\u00A30';
    if (value === 0 && type === 'percentage') return '0.00%';
    if (value === 0 && type === 'number') return '0';

    switch (type) {
      case 'currency':
        return `\u00A3${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <Card className="bg-card text-card-foreground overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4 border-b border-border flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-foreground text-xl font-semibold">
            Staff Performance Summary - {summaryData.staffName} ({summaryData.year})
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddRowError(null);
                setAddRowOpen(true);
              }}
              className="border-border"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Row
            </Button>
            <div className="w-[150px]">
              <Label htmlFor="staff-select" className="sr-only">Select Staff Member</Label>
              <Select value={selectedStaffId ?? 'all'} onValueChange={setSelectedStaffId}>
                <SelectTrigger id="staff-select" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px]">
              <Label htmlFor="year-select" className="sr-only">Select Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {yearOptions.map((yearOption) => (
                    <SelectItem key={yearOption} value={yearOption}>{yearOption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="px-6 py-3 text-xs text-muted-foreground border-b border-border">
              Loading performance data...
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-foreground sticky left-0 bg-muted/50 z-30 min-w-[180px] px-4 py-3 border-r border-border font-bold">Metric</TableHead>
                  {summaryData.months.map((month, index) => (
                    <TableHead key={index} className="text-foreground text-center min-w-[100px] px-4 py-3 font-bold">{month}</TableHead>
                  ))}
                  <TableHead className="text-foreground text-right sticky right-0 bg-primary/10 z-30 min-w-[100px] px-4 py-3 border-l border-border font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className={cn(
                    'transition-colors duration-150 border-b border-border',
                    rowIndex % 2 === 0 ? 'bg-card' : 'bg-gray-50',
                    'hover:bg-accent/50'
                  )}>
                    <TableCell className="font-bold text-foreground sticky left-0 z-20 px-4 py-2 border-r border-border group" style={{ backgroundColor: rowIndex % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--gray-50))' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{row.label}</span>
                        {row.isCustom && row.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomRow(row.id as string)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove custom row"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    {summaryData.months.map((month, colIndex) => {
                      const rating = cellRatings.find((entry) => entry.rowLabel === row.label && entry.month === month)?.rating;
                      const originalValue = (row.months[month] as number) || 0;
                      const displayValue = getCellValue(row.label, month, originalValue);
                      const hasManualOverride = manualValues.some((entry) => entry.rowLabel === row.label && entry.month === month);
                      return (
                        <TableCell
                          key={colIndex}
                          className={cn(
                            'font-bold text-center px-4 py-2 border-r border-border relative group cursor-pointer transition-colors',
                            rating === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100' :
                            rating === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' :
                            rating === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100' :
                            'text-muted-foreground',
                            hasManualOverride && 'ring-2 ring-inset ring-blue-400 dark:ring-blue-500'
                          )}
                          onClick={(event) => {
                            event.stopPropagation();

                            let newRating: 'red' | 'yellow' | 'green' | null = null;
                            if (!rating) newRating = 'green';
                            else if (rating === 'green') newRating = 'yellow';
                            else if (rating === 'yellow') newRating = 'red';
                            else newRating = null;

                            setCellRatings((previous) => {
                              const existing = previous.find((entry) => entry.rowLabel === row.label && entry.month === month);
                              if (existing) {
                                if (newRating === null) {
                                  return previous.filter((entry) => !(entry.rowLabel === row.label && entry.month === month));
                                }
                                return previous.map((entry) =>
                                  entry.rowLabel === row.label && entry.month === month
                                    ? { ...entry, rating: newRating }
                                    : entry
                                );
                              }
                              if (newRating === null) return previous;
                              return [...previous, { rowLabel: row.label, month, rating: newRating }];
                            });
                          }}
                        >
                          {formatValue(displayValue, row.type)}
                          <button
                            type="button"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCellEdit(row.label, month, row.type, displayValue);
                            }}
                            title="Edit value"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                              {rating ? 'Click to change rating' : 'Click to add rating'}
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="font-bold text-foreground text-right sticky right-0 bg-primary/10 z-20 px-4 py-2 border-l border-border" style={{ backgroundColor: rowIndex % 2 === 0 ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--primary)/0.15)' }}>
                      {formatValue(row.total, row.type)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-primary/20 font-bold hover:bg-primary/20 transition-colors duration-150">
                  <TableCell className="text-foreground sticky left-0 bg-primary/20 z-30 px-4 py-2 border-r border-border font-bold">TOTAL</TableCell>
                  {summaryData.months.map((month, index) => (
                    <TableCell key={`${month}-${index}`} className="text-foreground text-center px-4 py-2 font-bold" />
                  ))}
                  <TableCell className="text-foreground text-right sticky right-0 bg-primary/30 z-30 px-4 py-2 border-l border-border font-bold" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editingCell !== null} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Performance Value</DialogTitle>
            <DialogDescription>
              {editingCell && `${editingCell.rowLabel} - ${editingCell.month}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="staff-cell-value" className="text-sm font-medium">
              {editingCell?.type === 'currency' ? 'Value (\u00A3)' : editingCell?.type === 'percentage' ? 'Value (%)' : 'Value'}
            </Label>
            <Input
              id="staff-cell-value"
              type="number"
              step={editingCell?.type === 'percentage' ? '0.01' : '1'}
              value={editInputValue}
              onChange={(e) => setEditInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              className="mt-2"
              autoFocus
            />
            {editingCell?.type === 'percentage' && (
              <p className="text-xs text-muted-foreground mt-1">Enter as decimal (e.g., 0.85 for 85%)</p>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            {manualValues.some((entry) => entry.rowLabel === editingCell?.rowLabel && entry.month === editingCell?.month) && (
              <Button variant="outline" onClick={handleClearOverride} className="mr-auto">
                Reset to Original
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditingCell(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addRowOpen} onOpenChange={(open) => {
        setAddRowOpen(open);
        if (!open) {
          setNewRowLabel('');
          setNewRowType('number');
          setAddRowError(null);
        }
      }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Custom Metric</DialogTitle>
            <DialogDescription>Add a new row to track ratings alongside your existing metrics.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-custom-row-label">Metric name</Label>
              <Input
                id="staff-custom-row-label"
                value={newRowLabel}
                onChange={(e) => {
                  setNewRowLabel(e.target.value);
                  if (addRowError) setAddRowError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomRow();
                }}
                placeholder="e.g. Viewings"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-custom-row-type">Type</Label>
              <Select value={newRowType} onValueChange={(value) => setNewRowType(value as 'number' | 'currency' | 'percentage')}>
                <SelectTrigger id="staff-custom-row-type" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addRowError && (
              <p className="text-xs text-destructive">{addRowError}</p>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setAddRowOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomRow}>
              Add Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
