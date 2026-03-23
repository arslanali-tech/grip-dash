import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  TargetIcon,
  DollarSignIcon,
  PercentIcon,
  UsersIcon,
  CheckCircle2Icon,
  GaugeIcon,
  EditIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDashboardStore } from '@/stores/dashboardStore';
import { KpiProgressCard } from '@/components/KpiProgressCard';
import { TargetFlipCard } from '@/components/TargetFlipCard'; // Import TargetFlipCard
import { DateRangeSelector } from '@/components/DateRangeSelector';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';

interface StaffKpiData {
  id: string; // Unique ID for the KPI
  title: string;
  subtitle: string; // e.g., "This Year", "This Month"
  currentValue: number;
  goal: number;
  unit?: string; // e.g., "£", "%"
  progressBarColor: string; // Tailwind class for progress bar fill
  statusText: string; // e.g., "On Track", "Behind", "Achieved"
  statusColor: string; // Tailwind class for status text and dot
}

const calculateStatus = (current: number, target: number) => {
  if (target === 0) return { text: 'No Goal', color: 'text-muted-foreground', barColor: 'bg-muted' };
  const progress = (current / target) * 100;
  if (progress >= 100) return { text: 'Achieved', color: 'text-success', barColor: 'bg-success' };
  if (progress >= 70) return { text: 'On Track', color: 'text-warning', barColor: 'bg-warning' };
  return { text: 'Behind', color: 'text-destructive', barColor: 'bg-destructive' };
};

function computeStaffKPIs(
  staffId: string | null,
  staffMembers: { id: string; name: string; branch: string }[],
  movements: { date?: string; type?: string; status?: string; agent?: string; feeAmount?: number }[],
  dateRange: DateRange,
  rangeType: string
): StaffKpiData[] {
  const staff = staffMembers.find(s => s.id === staffId);
  const staffName = staff ? staff.name : 'All Staff';

  const inRange = (d: string) => {
    if (!dateRange.from || !dateRange.to) return true;
    const t = new Date(d).getTime();
    return t >= dateRange.from.getTime() && t <= dateRange.to.getTime();
  };
  const filtered = movements.filter(m => m.date && inRange(m.date));
  const byAgent = (name: string) => filtered.filter(m => (m.agent ?? '').toLowerCase().includes(name.toLowerCase()));
  const forStaff = staffId && staffId !== 'all' ? byAgent(staff?.name ?? '') : filtered;

  const valuationsBookedCurrent = forStaff.filter(m => m.status === 'valuation').length;
  const salesCompletedCurrent = forStaff.filter(m => m.type === 'sale' && (m.status === 'sale' || m.status === 'completed')).length;
  const offersAcceptedCurrent = forStaff.filter(m => m.status === 'offer' || m.status === 'let-offer').length;
  const totalRevenueCurrent = forStaff.reduce((s, m) => s + (m.feeAmount ?? 0), 0);
  const valuationsBookedGoal = Math.max(valuationsBookedCurrent, 1);
  const salesCompletedGoal = Math.max(salesCompletedCurrent, 1);
  const offersAcceptedGoal = Math.max(offersAcceptedCurrent, 1);
  const totalRevenueGoal = Math.max(totalRevenueCurrent, 1000);
  const conversionRateCurrent = valuationsBookedCurrent > 0 ? Math.round((salesCompletedCurrent / valuationsBookedCurrent) * 100) : 0;
  const conversionRateGoal = 70;
  const clientSatisfactionCurrent = 85;
  const clientSatisfactionGoal = 90;

  const valuationsBookedStatus = calculateStatus(valuationsBookedCurrent, valuationsBookedGoal);
  const salesCompletedStatus = calculateStatus(salesCompletedCurrent, salesCompletedGoal);
  const offersAcceptedStatus = calculateStatus(offersAcceptedCurrent, offersAcceptedGoal);
  const totalRevenueStatus = calculateStatus(totalRevenueCurrent, totalRevenueGoal);
  const conversionRateStatus = calculateStatus(conversionRateCurrent, conversionRateGoal);
  const clientSatisfactionStatus = calculateStatus(clientSatisfactionCurrent, clientSatisfactionGoal);

  return [
    {
      id: 'valuations-booked',
      title: 'Valuations Booked',
      subtitle: `This ${rangeType.replace('-', ' ')}`,
      currentValue: valuationsBookedCurrent,
      goal: valuationsBookedGoal,
      progressBarColor: valuationsBookedStatus.barColor,
      statusText: valuationsBookedStatus.text,
      statusColor: valuationsBookedStatus.color,
    },
    {
      id: 'sales-completed',
      title: 'Sales Completed',
      subtitle: `This ${rangeType.replace('-', ' ')}`,
      currentValue: salesCompletedCurrent,
      goal: salesCompletedGoal,
      progressBarColor: salesCompletedStatus.barColor,
      statusText: salesCompletedStatus.text,
      statusColor: salesCompletedStatus.color,
    },
    {
      id: 'offers-accepted',
      title: 'Offers Accepted',
      subtitle: `This ${rangeType.replace('-', ' ')}`,
      currentValue: offersAcceptedCurrent,
      goal: offersAcceptedGoal,
      progressBarColor: offersAcceptedStatus.barColor,
      statusText: offersAcceptedStatus.text,
      statusColor: offersAcceptedStatus.color,
    },
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      subtitle: `This ${rangeType.replace('-', ' ')}`,
      currentValue: totalRevenueCurrent,
      goal: totalRevenueGoal,
      unit: '£',
      progressBarColor: totalRevenueStatus.barColor,
      statusText: totalRevenueStatus.text,
      statusColor: totalRevenueStatus.color,
    },
    {
      id: 'conversion-rate',
      title: 'Conversion Rate',
      subtitle: 'Overall',
      currentValue: conversionRateCurrent,
      goal: conversionRateGoal,
      unit: '%',
      progressBarColor: conversionRateStatus.barColor,
      statusText: conversionRateStatus.text,
      statusColor: conversionRateStatus.color,
    },
    {
      id: 'client-satisfaction',
      title: 'Client Satisfaction',
      subtitle: 'Average Score',
      currentValue: clientSatisfactionCurrent,
      goal: clientSatisfactionGoal,
      unit: '%',
      progressBarColor: clientSatisfactionStatus.barColor,
      statusText: clientSatisfactionStatus.text,
      statusColor: clientSatisfactionStatus.color,
    },
  ];
};

export function StaffKPIsView() {
  const { staffMembers, movements } = useDashboardStore();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [rangeType, setRangeType] = useState<string>('month');
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [staffTargets, setStaffTargets] = useState<Record<string, StaffKpiData>>({});

  const currentKpis = useMemo(
    () => computeStaffKPIs(selectedStaffId, staffMembers, movements, dateRange, rangeType),
    [selectedStaffId, staffMembers, movements, dateRange, rangeType]
  );

  useEffect(() => {
    const targetsMap: Record<string, StaffKpiData> = {};
    currentKpis.forEach(kpi => {
      targetsMap[kpi.id] = kpi;
    });
    setStaffTargets(targetsMap);
  }, [selectedStaffId, dateRange, rangeType]);

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined, type: string) => {
    setDateRange({ from, to });
    setRangeType(type);
  };

  const handleSaveTarget = (kpiId: string, newGoal: number) => {
    setStaffTargets(prevTargets => ({
      ...prevTargets,
      [kpiId]: {
        ...prevTargets[kpiId],
        goal: newGoal,
      },
    }));
  };

  const displayKpis = Object.keys(staffTargets).length > 0
    ? currentKpis.map(kpi => ({ ...kpi, goal: staffTargets[kpi.id]?.goal ?? kpi.goal }))
    : currentKpis;

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Staff Key Performance Indicators
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-[200px]">
            <Label htmlFor="staff-select" className="sr-only">Select Staff Member</Label>
            <Select value={selectedStaffId || 'all'} onValueChange={setSelectedStaffId}>
              <SelectTrigger id="staff-select" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="all">All Staff</SelectItem>
                {staffMembers.map(staff => (
                  <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DateRangeSelector onRangeChange={handleDateRangeChange} initialRangeType="month" />
          <Button
            variant="outline"
            onClick={() => setIsEditingTargets(!isEditingTargets)}
            className={cn(
              "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
              isEditingTargets && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <EditIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            {isEditingTargets ? "Done Editing" : "Set KPI's"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayKpis.map((kpi) => (
          isEditingTargets ? (
            <TargetFlipCard
              key={`${kpi.id}-${selectedStaffId}-${rangeType}-edit`} // Unique key for edit mode
              title={kpi.title}
              subtitle={kpi.subtitle}
              currentValue={kpi.currentValue}
              goal={staffTargets[kpi.id]?.goal || kpi.goal} // Use state-managed goal
              unit={kpi.unit}
              colorClass={kpi.progressBarColor} // Use progress bar color for consistency
              onSave={(newGoal) => handleSaveTarget(kpi.id, newGoal)}
              initialFlipped={true} // Ensure it starts flipped to the edit side
            />
          ) : (
            <KpiProgressCard
              key={`${kpi.id}-${selectedStaffId}-${rangeType}-display`} // Unique key for display mode
              title={kpi.title}
              subtitle={kpi.subtitle}
              currentValue={kpi.currentValue}
              goal={staffTargets[kpi.id]?.goal || kpi.goal} // Use state-managed goal
              unit={kpi.unit}
              progressBarColor={kpi.progressBarColor}
              statusText={kpi.statusText}
              statusColor={kpi.statusColor}
            />
          )
        ))}
      </div>
    </div>
  );
}
