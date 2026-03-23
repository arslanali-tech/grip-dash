import React, { useState, useEffect } from 'react';
import { format, startOfMonth, startOfYear, subDays, subYears } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useDashboardStore } from "@/stores/dashboardStore";

export function DateRangePicker() {
  const { dateRange, setDateRange } = useDashboardStore();
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(dateRange);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftRange(dateRange);
    }
  }, [dateRange, isOpen]);

  const applyRange = (nextRange: DateRange | undefined, closeMenu = true) => {
    setDraftRange(nextRange);
    setDateRange({ from: nextRange?.from, to: nextRange?.to });
    if (closeMenu) {
      setIsOpen(false);
    }
  };

  const handlePreset = (preset: string) => {
    const today = new Date();
    let newRange: DateRange | undefined;

    switch (preset) {
      case 'today':
        newRange = { from: today, to: today };
        break;
      case 'currentMonth':
        newRange = { from: startOfMonth(today), to: today };
        break;
      case 'last7':
        newRange = { from: subDays(today, 7), to: today };
        break;
      case 'last30':
        newRange = { from: subDays(today, 30), to: today };
        break;
      case 'thisYear':
        newRange = { from: startOfYear(today), to: today };
        break;
      case 'lastYear':
        const lastYear = subYears(today, 1);
        newRange = { from: startOfYear(lastYear), to: new Date(lastYear.getFullYear(), 11, 31) };
        break;
    }

    applyRange(newRange);
  };

  const handleApply = () => {
    setDateRange({ from: draftRange?.from, to: draftRange?.to });
    setIsOpen(false);
  };

  const handleClear = () => {
    applyRange(undefined);
  };

  const appliedRange = dateRange;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 min-w-[240px] max-w-[240px] shrink-0 justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
            !appliedRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {appliedRange?.from ? (
            appliedRange.to ? (
              <span className="truncate">
                {format(appliedRange.from, "LLL dd, y")} - {format(appliedRange.to, "LLL dd, y")}
              </span>
            ) : (
              <span className="truncate">{format(appliedRange.from, "LLL dd, y")}</span>
            )
          ) : (
            <span className="truncate">Pick a date range</span>
          )}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[70] w-56 bg-popover text-popover-foreground" align="start">
        <DropdownMenuItem onClick={() => handlePreset('today')}>
          Today
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('currentMonth')}>
          Current month
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('last7')}>
          Last 7 days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('last30')}>
          Last 30 days
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('thisYear')}>
          This year ({new Date().getFullYear()})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('lastYear')}>
          Last year ({new Date().getFullYear() - 1})
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <span>Custom date range</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={8} className="z-[80] p-0 bg-popover text-popover-foreground">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={draftRange?.from ?? appliedRange?.from ?? new Date()}
                    selected={draftRange}
                    onSelect={setDraftRange}
                    numberOfMonths={2}
                />
            </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between p-2">
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                Clear all
            </Button>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 px-2 text-xs text-primary hover:text-primary/80">
                    Cancel
                </Button>
                <Button size="sm" onClick={handleApply} className="h-8 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                    Apply
                </Button>
            </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
