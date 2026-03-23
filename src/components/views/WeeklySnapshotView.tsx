import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon,
  CalendarIcon, MailIcon, TwitterIcon, LinkedinIcon, FacebookIcon,
  DumbbellIcon, UtensilsCrossedIcon, BriefcaseIcon, TargetIcon, CheckCircle2Icon,
  ChevronDownIcon, UsersIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, isSameWeek, parseISO } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useMemo } from 'react';

interface WeeklySnapshotProps {
  selectedStaffId: string | null;
  setSelectedStaffId: (id: string | null) => void;
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
}

interface Metric {
  label: string;
  value: string;
  change: number;
  isGood: boolean;
  icon: React.ElementType;
  iconColor: string;
}

interface ActivitySummary {
  title: string;
  icon: React.ElementType;
  color: string;
}

interface WeeklyPlanItem {
  day: string;
  tasks: string[];
}

const generateSnapshotData = (
  selectedStaffId: string | null,
  selectedBranchId: string | null,
  weekOffset: number,
  allMovements: any[],
  allProspects: any[],
  staffMembers: { id: string; name: string; role: string; branch: string }[],
  branches: { id: string; name: string }[]
) => {
  const weekStartsOn = 1; // Monday
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn });

  let userName = "Overall";
  let userRole = "Branch Owner";
  let targetBranchName = "All Branches";

  if (selectedStaffId && selectedStaffId !== 'all') {
    const staff = staffMembers.find(s => s.id === selectedStaffId);
    if (staff) {
      userName = staff.name;
      userRole = staff.role;
      targetBranchName = staff.branch;
    }
  } else if (selectedBranchId && selectedBranchId !== 'all') {
    const branch = branches.find(b => b.id === selectedBranchId || b.name === selectedBranchId);
    if (branch) {
      userName = `Branch: ${branch.name}`;
      userRole = "Branch Manager";
      targetBranchName = branch.name;
    }
  }

  const movementsThisWeek = allMovements.filter(m => {
    const moveDate = parseISO(m.date);
    const isThisWeek = isSameWeek(moveDate, currentWeekStart, { weekStartsOn });
    const matchesStaff = !selectedStaffId || selectedStaffId === 'all' || m.agent.toLowerCase().includes(userName.toLowerCase());
    const matchesBranch = !selectedBranchId || selectedBranchId === 'all' || m.branch === targetBranchName;
    return isThisWeek && matchesStaff && matchesBranch;
  });

  const prospectsThisWeek = allProspects.filter(p => {
    const prospectDate = parseISO(p.date);
    const isThisWeek = isSameWeek(prospectDate, currentWeekStart, { weekStartsOn });
    const matchesStaff = !selectedStaffId || selectedStaffId === 'all' || p.prospector.toLowerCase().includes(userName.toLowerCase());
    const matchesBranch = !selectedBranchId || selectedBranchId === 'all' || p.branch === targetBranchName;
    return isThisWeek && matchesStaff && matchesBranch;
  });

  const totalSales = movementsThisWeek.filter(m => m.type === 'sale').length;
  const totalLettings = movementsThisWeek.filter(m => m.type === 'letting').length;
  const totalOffers = movementsThisWeek.filter(m => m.status === 'offer' || m.status === 'let-offer').length;
  const totalValuations = movementsThisWeek.filter(m => m.status === 'valuation').length;
  const newProspects = prospectsThisWeek.length;
  const prospectsConverted = prospectsThisWeek.filter(p => p.movementBooked).length;

  const salesChange = Math.floor(Math.random() * 20) - 10;
  const offersChange = Math.floor(Math.random() * 15) - 7;
  const newProspectsChange = Math.floor(Math.random() * 25) - 12;
  const valuationsChange = Math.floor(Math.random() * 10) - 5;
  const tasksCompletedChange = Math.floor(Math.random() * 5) - 2;

  const metrics: Metric[] = [
    { label: 'Sales', value: `${totalSales}`, change: salesChange, isGood: true, icon: BriefcaseIcon, iconColor: 'text-blue-500' },
    { label: 'Offers', value: `${totalOffers}`, change: offersChange, isGood: true, icon: TargetIcon, iconColor: 'text-red-500' },
    { label: 'New Prospects', value: `${newProspects}`, change: newProspectsChange, isGood: true, icon: UsersIcon, iconColor: 'text-green-500' },
    { label: 'Valuations', value: `${totalValuations}`, change: valuationsChange, isGood: true, icon: CalendarIcon, iconColor: 'text-purple-500' },
    { label: 'Tasks Completed', value: `${90 + tasksCompletedChange}%`, change: tasksCompletedChange, isGood: true, icon: CheckCircle2Icon, iconColor: 'text-orange-500' },
  ];

  const activitySummaries: ActivitySummary[] = [
    { title: 'Busiest day was Tuesday', icon: TrendingUpIcon, color: 'bg-blue-600' },
    { title: 'You exercised 3 times', icon: DumbbellIcon, color: 'bg-gray-700' },
    { title: 'Your meetings decreased 10%', icon: BriefcaseIcon, color: 'bg-yellow-600' },
    { title: 'You ate lunch 5 times', icon: UtensilsCrossedIcon, color: 'bg-pink-600' },
  ];

  const weeklyPlan: WeeklyPlanItem[] = [
    { day: 'MON', tasks: ['Weekly Kickoff', 'Client Follow-ups', 'Property Valuations'] },
    { day: 'TUE', tasks: ['Team Meeting', 'New Prospecting Leads', 'Marketing Review'] },
    { day: 'WED', tasks: ['Client Viewings', 'Offer Negotiations'] },
    { day: 'THU', tasks: ['Admin Tasks', 'Training Session'] },
    { day: 'FRI', tasks: ['Weekly Report', 'Client Outreach'] },
  ];

  return {
    weekRange: `${format(currentWeekStart, 'MMM dd')} - ${format(currentWeekEnd, 'MMM dd')}`,
    metrics,
    activitySummaries,
    weeklyPlan,
    userName: userName,
    userRole: userRole,
  };
};

export function WeeklySnapshotView({ selectedStaffId, setSelectedStaffId, selectedBranchId, setSelectedBranchId }: WeeklySnapshotProps) {
  const { movements, prospects, staffMembers } = useDashboardStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const branchesFromMovements = useMemo(() => {
    const names = new Set(movements.map(m => m.branch).filter(Boolean));
    return Array.from(names).map(n => ({ id: n, name: n }));
  }, [movements]);

  const snapshotData = generateSnapshotData(
    selectedStaffId,
    selectedBranchId,
    weekOffset,
    movements,
    prospects,
    staffMembers,
    branchesFromMovements
  );

  const handlePreviousWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10 max-w-3xl mx-auto">
      <Card className="bg-card text-card-foreground overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
              <ChevronDownIcon className="h-5 w-5 rotate-90" />
            </Button>
            <CardTitle className="text-foreground text-xl font-semibold text-center">
              {snapshotData.userName}'s {snapshotData.weekRange}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleNextWeek}>
              <ChevronDownIcon className="h-5 w-5 -rotate-90" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Weekly Productivity Snapshot for {snapshotData.userRole}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border">
            {snapshotData.metrics.map((metric, index) => {
              const Icon = metric.icon;
              const ChangeIcon = metric.change > 0 ? ArrowUpIcon : ArrowDownIcon;
              const changeColor = metric.change > 0 ? 'text-success' : 'text-destructive';
              return (
                <div key={index} className="flex flex-col items-center justify-center p-4 bg-background text-center">
                  <Icon className={cn("h-8 w-8 mb-2", metric.iconColor)} strokeWidth={1.5} />
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <ChangeIcon className={cn("h-3 w-3", changeColor)} strokeWidth={2} />
                    <span className={changeColor}>{Math.abs(metric.change)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative p-4 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 text-white text-center font-semibold text-lg">
            You finished 100% of your tasks this week!
          </div>

          <div className="grid grid-cols-2 gap-px bg-border">
            {snapshotData.activitySummaries.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className={cn("flex items-center gap-3 p-4 text-white", activity.color)}>
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                  <p className="text-sm font-medium">{activity.title}</p>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-4">What's up next week</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {snapshotData.weeklyPlan.map((plan, index) => (
                <div key={index} className="bg-muted/50 p-4 rounded-md">
                  <p className="font-semibold text-foreground mb-2">{plan.day}</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {plan.tasks.map((task, taskIndex) => (
                      <li key={taskIndex}>{task}</li>
                    ))}
                  </ul>
                  {plan.tasks.length > 3 && (
                    <p className="text-xs text-primary mt-2 cursor-pointer">+{plan.tasks.length - 3} more</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4 p-4 border-t border-border bg-background">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <TwitterIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <LinkedinIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <FacebookIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <MailIcon className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
