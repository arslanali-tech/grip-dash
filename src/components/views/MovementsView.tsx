import { useState, useEffect } from 'react';
import { FilterRow } from '../FilterRow';
import { DataTabs } from '../DataTabs';
import { SummaryCards } from '../SummaryCards';
import { DataTable } from '../DataTable';
import { MapView } from '../MapView';
import { MovementAnalyticsCards } from '../MovementAnalyticsCards';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { 
  FilterIcon, SlidersHorizontalIcon, BookmarkIcon, ClockIcon, UserIcon, 
  FootprintsIcon, MusicIcon, GaugeIcon, MessageSquareIcon, TrendingUpIcon, 
  ChevronDownIcon, Building2Icon, XIcon, NewspaperIcon 
} from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '../DateRangePicker';
import { BranchSelect } from '../BranchSelect';
import { StatusSelect } from '../StatusSelect';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MovementsViewProps {
  branchName?: string;
  agencyId?: string;
}

export function MovementsView({ branchName, agencyId }: MovementsViewProps = {}) {
  const isMobile = useIsMobile();
  const { clearFilters, dateRange, compareDateRange, isComparingDates, selectedBranch, selectedStatus, viewMode, loadStaffMembers } = useDashboardStore();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

  useEffect(() => {
    if (agencyId) {
      loadStaffMembers(agencyId);
    }
  }, [agencyId, loadStaffMembers]);

  const hasActiveFilters = 
    dateRange.from || 
    dateRange.to || 
    (isComparingDates && (compareDateRange.from || compareDateRange.to)) ||
    selectedBranch !== 'all' ||
    selectedStatus !== 'all';

  // Format date range for analytics
  const dateFromStr = dateRange.from ? dateRange.from.toISOString().slice(0, 10) : undefined;
  const dateToStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : undefined;

  return (
    <div className={cn("space-y-4", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Movement Analytics Cards */}
      {agencyId && (
        <MovementAnalyticsCards 
          agencyId={agencyId} 
          dateFrom={dateFromStr}
          dateTo={dateToStr}
        />
      )}
      
      <SummaryCards />
      
      <FilterRow />
      
      {viewMode === 'map' ? (
        <div className="animate-in fade-in-50 duration-300">
          <MapView />
        </div>
      ) : (
        <div className="animate-in fade-in-50 duration-300">
          <DataTable />
        </div>
      )}

      {isMobile && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="default"
                size="default"
                className="rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-10"
              >
                <SlidersHorizontalIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] bg-card">
              <SheetHeader className="flex flex-row items-center justify-between px-4 pt-4">
                <SheetTitle className="text-foreground text-xl">Filter Movements</SheetTitle>
                <Button variant="ghost" size="icon" onClick={() => setFilterSheetOpen(false)}>
                  <XIcon className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </SheetHeader>
              <div className="flex flex-col gap-4 p-4">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label htmlFor="date-range-filter" className="text-foreground">Date Range</Label>
                  <DateRangePicker />
                </div>

                {/* Branch Filter */}
                <div className="space-y-2">
                  <Label htmlFor="branch-filter" className="text-foreground">Branch</Label>
                  <BranchSelect />
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter" className="text-foreground">Status</Label>
                  <StatusSelect />
                </div>
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
      )}
    </div>
  );
}
