import { useState, useEffect, ComponentType, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { 
  BarChart3Icon, 
  DownloadIcon,
  LayoutDashboardIcon,
  BrainCircuitIcon,
  UsersIcon,
  BarChart2Icon,
  FileTextIcon,
  LucideIcon,
  Loader2Icon,
  PlusIcon,
  TargetIcon
} from 'lucide-react';
import { DateRangePicker } from '../DateRangePicker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BranchOverviewView } from './BranchOverviewView';
import { BranchIntelligenceView } from './BranchIntelligenceView';
import { BranchTeamPerformanceView } from './BranchTeamPerformanceView';
import { BranchDataAnalyticsView } from './BranchDataAnalyticsView';
import { BranchReportingView } from './BranchReportingView';
import { useBranchAnalyticsTabsStore, BranchAnalyticsTab } from '@/stores/branchAnalyticsTabsStore';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useBranchGoalsStore, type GoalType, type GoalPriority } from '@/stores/branchGoalsStore';
import { format, addMonths } from 'date-fns';

interface BranchAnalyticsViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

// Icon mapping from string to component
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboardIcon,
  BrainCircuitIcon,
  UsersIcon,
  BarChart2Icon,
  FileTextIcon,
  BarChart3Icon,
};

// Component mapping from string to component
const COMPONENT_MAP: Record<string, ComponentType<BranchAnalyticsViewProps>> = {
  BranchOverviewView,
  BranchIntelligenceView,
  BranchTeamPerformanceView,
  BranchDataAnalyticsView,
  BranchReportingView,
};

const TAB_TRIGGER_CLASSES = "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground";

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'instructions', label: 'Instructions' },
  { value: 'completions', label: 'Completions' },
  { value: 'lettings', label: 'Lettings' },
  { value: 'valuations', label: 'Valuations' },
  { value: 'custom', label: 'Custom' },
];

const PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || LayoutDashboardIcon;
}

function getTabComponent(componentKey: string): ComponentType<BranchAnalyticsViewProps> | null {
  return COMPONENT_MAP[componentKey] || null;
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function BranchAnalyticsView({ agencyId, branchId, branchName }: BranchAnalyticsViewProps = {}) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { tabs, isLoading, fetchTabs } = useBranchAnalyticsTabsStore();
  const { movements, dateRange, loadMovements } = useDashboardStore();
  const { createGoal, fetchGoals } = useBranchGoalsStore();
  const [activeTab, setActiveTab] = useState<string>('');
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    goal_type: 'revenue' as GoalType,
    target_value: 0,
    unit: '£',
    deadline: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    owner_name: '',
    priority: 'medium' as GoalPriority,
    is_auto_tracked: true,
  });

  // Get user role from metadata
  const userRole = (user?.user_metadata as any)?.role || 'branch_manager';

  // Load movements when opening Branch Analytics so data is fresh
  useEffect(() => {
    if (agencyId) {
      loadMovements(agencyId);
    }
  }, [agencyId, loadMovements]);

  const handleCreateGoal = useCallback(async () => {
    if (!agencyId || !newGoal.title || newGoal.target_value <= 0) return;
    await createGoal({
      agency_id: agencyId,
      branch_id: branchId || null,
      title: newGoal.title,
      description: newGoal.description,
      goal_type: newGoal.goal_type,
      target_value: newGoal.target_value,
      unit: newGoal.unit,
      deadline: newGoal.deadline,
      owner_name: newGoal.owner_name,
      priority: newGoal.priority,
      is_auto_tracked: newGoal.is_auto_tracked,
    });
    setAddGoalOpen(false);
    setNewGoal({
      title: '',
      description: '',
      goal_type: 'revenue',
      target_value: 0,
      unit: '£',
      deadline: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      owner_name: '',
      priority: 'medium',
      is_auto_tracked: true,
    });
    fetchGoals(agencyId, branchId);
  }, [agencyId, branchId, newGoal, createGoal, fetchGoals]);

  const handleExportReport = useCallback(() => {
    let filtered = [...movements];
    if (branchName) filtered = filtered.filter(m => m.branch === branchName);
    else if (branchId) filtered = filtered.filter(m => m.branch === branchId);
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
        return true;
      });
    }
    const headers = ['Date', 'Property', 'Address', 'Type', 'Status', 'Price', 'Fee', 'Agent', 'Branch'];
    const rows = filtered.map(m => [
      m.date,
      m.property ?? '',
      m.address ?? '',
      m.type ?? '',
      m.status ?? '',
      m.price ?? '',
      m.feeAmount ?? m.feePercentage ?? '',
      m.agent ?? '',
      m.branch ?? '',
    ]);
    const csv = [headers.map(escapeCsvCell).join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branch-analytics-${branchName || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [movements, branchId, branchName, dateRange]);

  // Fetch tabs when agencyId changes
  useEffect(() => {
    if (agencyId) {
      fetchTabs(agencyId, userRole);
    } else {
      // Load defaults if no agency
      fetchTabs('', userRole);
    }
  }, [agencyId, userRole, fetchTabs]);

  // Set active tab when tabs are loaded
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].slug);
    } else if (tabs.length > 0 && !tabs.find(t => t.slug === activeTab)) {
      // If current active tab is not in the list, reset to first tab
      setActiveTab(tabs[0].slug);
    }
  }, [tabs, activeTab]);

  const viewProps = { agencyId, branchId, branchName };

  // Loading state
  if (isLoading && tabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading tabs...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      {/* Sub-menu */}
      <div className="border-b border-border bg-card px-4 md:px-6 py-4">
        <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0 mx-auto">
            {tabs.map((tab: BranchAnalyticsTab) => {
              const IconComponent = getIconComponent(tab.icon);
              return (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.slug} 
                  className={TAB_TRIGGER_CLASSES}
                >
                  <IconComponent className="h-4 w-4" />
                  {tab.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn("space-y-6", isMobile ? "p-4" : "p-6 md:p-8")}>
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                Branch Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Detailed insights and performance metrics for your branch
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker />
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setAddGoalOpen(true)}>
                <TargetIcon className="h-4 w-4" strokeWidth={1.5} />
                Add Goal
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" onClick={handleExportReport}>
                <DownloadIcon className="h-4 w-4" strokeWidth={1.5} />
                Export Report
              </Button>
            </div>
          </div>

          {tabs.map((tab: BranchAnalyticsTab) => {
            const TabComponent = getTabComponent(tab.component_key);
            if (!TabComponent) return null;
            return (
              <TabsContent key={tab.id} value={tab.slug} className="mt-0">
                <TabComponent {...viewProps} />
              </TabsContent>
            );
          })}
        </div>
      </div>

      <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Set a new goal to track branch performance. Goals are saved to the database and appear in Team Performance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input
                id="goal-title"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g., Q1 Revenue Target"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-desc">Description</Label>
              <Input
                id="goal-desc"
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Describe the goal..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Goal Type</Label>
                <Select
                  value={newGoal.goal_type}
                  onValueChange={(value: GoalType) => {
                    const units: Record<GoalType, string> = {
                      revenue: '£',
                      lettings: '£',
                      instructions: 'instructions',
                      completions: 'deals',
                      valuations: 'valuations',
                      custom: 'units',
                    };
                    setNewGoal({ ...newGoal, goal_type: value, unit: units[value] });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={newGoal.priority}
                  onValueChange={(v: GoalPriority) => setNewGoal({ ...newGoal, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Target Value ({newGoal.unit})</Label>
                <Input
                  type="number"
                  value={newGoal.target_value || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                  placeholder="e.g., 100000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Owner</Label>
              <Input
                value={newGoal.owner_name}
                onChange={(e) => setNewGoal({ ...newGoal, owner_name: e.target.value })}
                placeholder="e.g., Branch Manager"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="goal-auto"
                checked={newGoal.is_auto_tracked}
                onChange={(e) => setNewGoal({ ...newGoal, is_auto_tracked: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="goal-auto" className="text-sm font-normal">
                Auto-track progress from movements data
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGoal} disabled={!agencyId || !newGoal.title || newGoal.target_value <= 0}>
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
