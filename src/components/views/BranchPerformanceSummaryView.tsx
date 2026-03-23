import React, { useState, useEffect } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { fetchMonthlyBranchMetrics, MonthlyBranchMetrics } from '@/lib/dashboardApi';
import { fetchClientBranchesForAgency } from '@/lib/ownerApi';

interface BranchSummaryData {
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

interface BranchPerformanceSummaryViewProps {
  initialSelectedBranchId: string;
  agencyId?: string;
}

export function BranchPerformanceSummaryView({ initialSelectedBranchId, agencyId }: BranchPerformanceSummaryViewProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(() => String(currentYear));
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialSelectedBranchId);
  const [cellRatings, setCellRatings] = useState<CellRating[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyBranchMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualValues, setManualValues] = useState<ManualCellValue[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editInputValue, setEditInputValue] = useState<string>('');
  const [customRows, setCustomRows] = useState<CustomRowDefinition[]>([]);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [newRowLabel, setNewRowLabel] = useState('');
  const [newRowType, setNewRowType] = useState<'number' | 'currency' | 'percentage'>('number');
  const [addRowError, setAddRowError] = useState<string | null>(null);
  const yearOptions = React.useMemo(() => {
    const options = Array.from({ length: 6 }, (_, index) => String(currentYear - index));
    if (!options.includes(selectedYear)) options.push(selectedYear);
    return options.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
  }, [currentYear, selectedYear]);

  // Load branches and monthly metrics
  useEffect(() => {
    const loadData = async () => {
      if (!agencyId) {
        setBranches([]);
        setMonthlyMetrics([]);
        setLoading(false);
        return;
      }

      const selectedYearInt = Number.parseInt(selectedYear, 10);
      const metricsYear = Number.isNaN(selectedYearInt) ? currentYear : selectedYearInt;

      setLoading(true);
      const [branchRows, metrics] = await Promise.all([
        fetchClientBranchesForAgency(agencyId),
        fetchMonthlyBranchMetrics(agencyId, metricsYear),
      ]);

      setBranches(branchRows.map((b) => ({ id: b.id, name: b.name })));
      setMonthlyMetrics(metrics);
      setLoading(false);
    };

    void loadData();
  }, [agencyId, selectedYear, currentYear]);

  // Build summary data from real metrics
  const summaryData = React.useMemo(() => {
    const branchName =
      selectedBranchId === 'all'
        ? 'All Branches'
        : branches.find((b) => b.id === selectedBranchId)?.name ?? 'All Branches';

    const relevantMetrics =
      selectedBranchId === 'all'
        ? monthlyMetrics
        : monthlyMetrics.filter((m) => m.branchId === selectedBranchId);

    // Aggregate by month
    const monthsArr = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const buildRow = (
      label: string,
      type: 'number' | 'currency' | 'percentage',
      getValue: (m: MonthlyBranchMetrics) => number
    ): BranchSummaryData => {
      const monthValues: { [key: string]: number } = {};
      let total = 0;
      let count = 0;

      for (const monthName of monthsArr) {
        const monthMetrics = relevantMetrics.filter((m) => m.month === monthName);
        const sum = monthMetrics.reduce((acc, m) => acc + getValue(m), 0);
        monthValues[monthName] = sum;
        total += sum;
        if (type === 'percentage' && sum > 0) count++;
      }

      return {
        label,
        type,
        months: monthValues,
        total: type === 'percentage' && count > 0 ? total / count : total,
      };
    };

    const data: BranchSummaryData[] = [
      buildRow('Instructions', 'number', (m) => m.instructions),
      buildRow('Sales', 'number', (m) => m.sales),
      buildRow('Total Value of Sales', 'currency', (m) => m.salesValue),
      buildRow('Lets Agreed', 'number', (m) => m.lettings),
      buildRow('Lets Agreed £', 'currency', (m) => m.lettingsValue),
      buildRow('Exchanges', 'number', (m) => m.exchanges),
      buildRow('Total Value of Exchanges', 'currency', (m) => m.exchangesValue),
      buildRow('Completions', 'number', (m) => m.completions),
      buildRow('Total Value of Completions', 'currency', (m) => m.completionsValue),
      buildRow('Total Number of Aborts', 'number', (m) => m.aborts),
      buildRow('Total Value of Aborts £', 'currency', (m) => m.abortsValue),
      buildRow('Total Revenue Booked', 'currency', (m) => m.totalRevenue),
      ...customRows.map((row) => ({
        id: row.id,
        label: row.label,
        type: row.type,
        months: monthsArr.reduce((acc, month) => ({ ...acc, [month]: 0 }), {} as { [key: string]: number }),
        total: 0,
        isCustom: true,
      })),
    ];

    const selectedYearInt = Number.parseInt(selectedYear, 10);
    return {
      branchName,
      year: Number.isNaN(selectedYearInt) ? currentYear : selectedYearInt,
      months: monthsArr,
      data,
    };
  }, [selectedBranchId, branches, monthlyMetrics, selectedYear, currentYear, customRows]);

  React.useEffect(() => {
    setSelectedBranchId(initialSelectedBranchId);
  }, [initialSelectedBranchId]);

  // Auto-save ratings whenever they change
  React.useEffect(() => {
    if (cellRatings.length > 0) {
      console.log('Auto-saving ratings:', cellRatings);
      // In a real app, this would save to backend/localStorage
      localStorage.setItem(`branch-ratings-${selectedBranchId}-${selectedYear}`, JSON.stringify(cellRatings));
    }
  }, [cellRatings, selectedBranchId, selectedYear]);

  // Load saved ratings on mount
  React.useEffect(() => {
    const savedRatings = localStorage.getItem(`branch-ratings-${selectedBranchId}-${selectedYear}`);
    if (savedRatings) {
      try {
        const parsed = JSON.parse(savedRatings);
        setCellRatings(parsed);
      } catch (e) {
        console.error('Failed to load saved ratings:', e);
      }
    }
  }, [selectedBranchId, selectedYear]);

  const customRowsStorageKey = `branch-custom-rows-${selectedBranchId}-${selectedYear}`;

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (customRows.length > 0) {
      localStorage.setItem(customRowsStorageKey, JSON.stringify(customRows));
    } else {
      localStorage.removeItem(customRowsStorageKey);
    }
  }, [customRows, customRowsStorageKey]);

  // Load saved manual values on mount
  React.useEffect(() => {
    const savedValues = localStorage.getItem(`branch-manual-values-${selectedBranchId}-${selectedYear}`);
    if (savedValues) {
      try {
        const parsed = JSON.parse(savedValues);
        setManualValues(parsed);
      } catch (e) {
        console.error('Failed to load saved manual values:', e);
      }
    } else {
      setManualValues([]);
    }
  }, [selectedBranchId, selectedYear]);

  // Auto-save manual values whenever they change
  React.useEffect(() => {
    if (manualValues.length > 0) {
      localStorage.setItem(`branch-manual-values-${selectedBranchId}-${selectedYear}`, JSON.stringify(manualValues));
    }
  }, [manualValues, selectedBranchId, selectedYear]);

  // Get cell value with manual override support
  const getCellValue = (rowLabel: string, month: string, originalValue: number): number => {
    const manualEntry = manualValues.find(v => v.rowLabel === rowLabel && v.month === month);
    return manualEntry !== undefined ? manualEntry.value : originalValue;
  };

  // Handle cell click to open edit dialog
  const handleCellClick = (rowLabel: string, month: string, type: 'number' | 'currency' | 'percentage', currentValue: number) => {
    setEditingCell({ rowLabel, month, type, currentValue });
    setEditInputValue(currentValue.toString());
  };

  // Save the edited value
  const handleSaveEdit = () => {
    if (!editingCell) return;

    const numValue = parseFloat(editInputValue) || 0;
    
    setManualValues(prev => {
      const existing = prev.find(v => v.rowLabel === editingCell.rowLabel && v.month === editingCell.month);
      if (existing) {
        return prev.map(v =>
          v.rowLabel === editingCell.rowLabel && v.month === editingCell.month
            ? { ...v, value: numValue }
            : v
        );
      } else {
        return [...prev, { rowLabel: editingCell.rowLabel, month: editingCell.month, value: numValue }];
      }
    });

    setEditingCell(null);
    setEditInputValue('');
  };

  // Clear manual override for a cell
  const handleClearOverride = () => {
    if (!editingCell) return;
    setManualValues(prev => prev.filter(v => !(v.rowLabel === editingCell.rowLabel && v.month === editingCell.month)));
    setEditingCell(null);
    setEditInputValue('');
  };

  const handleAddCustomRow = () => {
    const trimmed = newRowLabel.trim();
    if (!trimmed) {
      setAddRowError('Please enter a metric name.');
      return;
    }

    const normalizeLabel = (value: string) => value.trim().toLowerCase();
    const existingLabels = new Set(summaryData.data.map((row) => normalizeLabel(row.label)));
    if (existingLabels.has(normalizeLabel(trimmed))) {
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
        setManualValues((values) => values.filter((entry) => entry.rowLabel !== rowToRemove.label));
        setCellRatings((ratings) => ratings.filter((entry) => entry.rowLabel !== rowToRemove.label));
      }
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const formatValue = (value: number | string, type: 'number' | 'currency' | 'percentage') => {
    if (typeof value === 'string') return value;
    if (value === 0 && type === 'currency') return '£0';
    if (value === 0 && type === 'percentage') return '0.00%';
    if (value === 0 && type === 'number') return '0';

    switch (type) {
      case 'currency':
        return `£${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
            Branch Performance Summary - {summaryData.branchName} ({summaryData.year})
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
              <Label htmlFor="branch-select" className="sr-only">Select Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger id="branch-select" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
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
                    "transition-colors duration-150 border-b border-border", // Add bottom border to rows
                    rowIndex % 2 === 0 ? "bg-card" : "bg-gray-50", // Alternating row colors
                    "hover:bg-accent/50"
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
                      const rating = cellRatings.find(r => r.rowLabel === row.label && r.month === month)?.rating;
                      const originalValue = (row.months[month] as number) || 0;
                      const displayValue = getCellValue(row.label, month, originalValue);
                      const hasManualOverride = manualValues.some(v => v.rowLabel === row.label && v.month === month);
                      return (
                        <TableCell 
                          key={colIndex} 
                          className={cn(
                            "font-bold text-center px-4 py-2 border-r border-border relative group cursor-pointer transition-colors",
                            rating === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100' :
                            rating === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100' :
                            rating === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100' :
                            'text-muted-foreground',
                            hasManualOverride && 'ring-2 ring-inset ring-blue-400 dark:ring-blue-500'
                          )}
                          onClick={() => handleCellClick(row.label, month, row.type, displayValue)}
                        >
                          {formatValue(displayValue, row.type)}
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                              Click to edit value
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
                {/* Total Row */}
                <TableRow className="bg-primary/20 font-bold hover:bg-primary/20 transition-colors duration-150">
                  <TableCell className="text-foreground sticky left-0 bg-primary/20 z-30 px-4 py-2 border-r border-border font-bold">TOTAL</TableCell>
                  {summaryData.months.map((month, index) => (
                    <TableCell key={index} className="text-foreground text-center px-4 py-2 font-bold">
                      {/* Calculate and display monthly totals if needed, or leave blank */}
                    </TableCell>
                  ))}
                  <TableCell className="text-foreground text-right sticky right-0 bg-primary/30 z-30 px-4 py-2 border-l border-border font-bold">
                    {/* Calculate and display grand total if needed */}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Edit Cell Dialog */}
      <Dialog open={editingCell !== null} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Performance Value</DialogTitle>
            <DialogDescription>
              {editingCell && `${editingCell.rowLabel} - ${editingCell.month}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cell-value" className="text-sm font-medium">
              {editingCell?.type === 'currency' ? 'Value (£)' : editingCell?.type === 'percentage' ? 'Value (%)' : 'Value'}
            </Label>
            <Input
              id="cell-value"
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
            {manualValues.some(v => v.rowLabel === editingCell?.rowLabel && v.month === editingCell?.month) && (
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
            <DialogDescription>Add a new row to track additional branch metrics.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="branch-custom-row-label">Metric name</Label>
              <Input
                id="branch-custom-row-label"
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
              <Label htmlFor="branch-custom-row-type">Type</Label>
              <Select value={newRowType} onValueChange={(value) => setNewRowType(value as 'number' | 'currency' | 'percentage')}>
                <SelectTrigger id="branch-custom-row-type" className="w-full bg-background text-foreground border-border">
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
