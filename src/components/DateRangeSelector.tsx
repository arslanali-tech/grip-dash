import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, addDays } from 'date-fns';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type DateRangeType = 'week' | 'month' | 'quarter' | 'year-to-date' | 'custom';

interface DateRangeSelectorProps {
  onRangeChange: (from: Date | undefined, to: Date | undefined, type: DateRangeType) => void;
  initialRangeType?: DateRangeType;
  initialFrom?: Date;
  initialTo?: Date;
}

export function DateRangeSelector({
  onRangeChange,
  initialRangeType = 'month',
  initialFrom,
  initialTo,
}: DateRangeSelectorProps) {
  const [selectedType, setSelectedType] = useState<DateRangeType>(initialRangeType);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: initialFrom,
    to: initialTo,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const calculateDateRange = (type: DateRangeType): DateRange => {
    const now = new Date();
    switch (type) {
      case 'week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'year-to-date':
        return { from: startOfYear(now), to: now };
      case 'custom':
        return customDateRange || { from: undefined, to: undefined };
      default:
        return { from: undefined, to: undefined };
    }
  };

  useEffect(() => {
    const { from, to } = calculateDateRange(selectedType);
    onRangeChange(from, to, selectedType);
  }, [selectedType, customDateRange]); // Only re-run if type or custom range changes

  const handleTypeChange = (type: DateRangeType) => {
    setSelectedType(type);
    if (type !== 'custom') {
      const { from, to } = calculateDateRange(type);
      setCustomDateRange({ from, to });
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setIsCalendarOpen(false); // Close calendar once both dates are selected
    }
  };

  const displayLabel = () => {
    const { from, to } = calculateDateRange(selectedType);
    if (selectedType === 'custom' && (!from && !to)) {
      return 'Custom Range';
    }
    if (!from) return 'Select Date Range';

    const formattedFrom = format(from, 'MMM dd');
    const formattedTo = to ? format(to, 'MMM dd, yyyy') : format(from, 'yyyy'); // Show year for single day or end date

    if (from && to && format(from, 'yyyy') === format(to, 'yyyy')) {
      return `${formattedFrom} - ${format(to, 'MMM dd, yyyy')}`;
    }
    return `${formattedFrom} - ${formattedTo}`;
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-[150px] justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
          >
            {selectedType.charAt(0).toUpperCase() + selectedType.slice(1).replace('-', ' ')}
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
          <DropdownMenuItem onClick={() => handleTypeChange('week')}>Week</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange('month')}>Month</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange('quarter')}>Quarter</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange('year-to-date')}>Year to Date</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeChange('custom')}>Custom</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedType === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[200px] justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground',
                (!customDateRange?.from && !customDateRange?.to) && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {displayLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover text-popover-foreground" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={customDateRange?.from ?? new Date()}
              selected={customDateRange}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
