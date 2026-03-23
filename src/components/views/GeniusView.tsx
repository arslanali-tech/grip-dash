import React, { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
  PoundSterlingIcon,
  PercentIcon,
  DollarSignIcon,
  PieChartIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  CalendarIcon,
  UsersIcon,
  Building2Icon,
  GaugeIcon,
  BarChart2Icon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PerformanceCalculator } from '@/components/PerformanceCalculator';
import { useDashboardStore } from '@/stores/dashboardStore';
import { fetchClientBranchesForAgency } from '@/lib/ownerApi';
import { fetchBranchPerformanceMetrics } from '@/lib/dashboardApi';
import { WeeklySnapshotView } from './WeeklySnapshotView'; // Import the updated WeeklySnapshotView
import { BranchPerformanceSummaryView } from './BranchPerformanceSummaryView'; // Import BranchPerformanceSummaryView
import { StaffPerformanceSummaryView } from './StaffPerformanceSummaryView'; // Import StaffPerformanceSummaryView
import { SetTargetsView } from './SetTargetsView'; // Import the new component
import { CalendarView } from './CalendarView'; // Import CalendarView
import { KPIsView } from './KPIsView'; // Import KPIsView
import { StaffKPIsView } from './StaffKPIsView'; // Import StaffKPIsView
import { GeniusAIView } from './GeniusAIView';
import { GeniusPerformanceView } from './GeniusPerformanceView';
import { ForecastingView } from './ForecastingView';
import { cn } from '@/lib/utils';

interface BranchKPI {
  branch: string;
  salesTarget: number;
  lettingsTarget: number;
  revenueTarget: number;
  valuationsTarget: number;
  currentSales: number;
  currentLettings: number;
  currentRevenue: number;
  currentValuations: number;
}

// Branch KPIs are loaded from Supabase (fetchBranchPerformanceMetrics) in the component

const costBreakdownData = [
  { name: 'Staff Costs', value: 632680, color: '#4169E1', percentage: 68 },
  { name: 'Marketing', value: 111320, color: '#9370DB', percentage: 12 },
  { name: 'Operations', value: 102430, color: '#FFB800', percentage: 11 },
  { name: 'Property Costs', value: 25460, color: '#2E8B57', percentage: 3 },
  { name: 'Technology', value: 45230, color: '#FF6347', percentage: 5 },
  { name: 'Other', value: 10000, color: '#808080', percentage: 1 },
];

const monthlyCostTrend = [
  { month: 'Jan', total: 85000, staff: 58000, marketing: 10000, operations: 9000, other: 8000 },
  { month: 'Feb', total: 88000, staff: 60000, marketing: 10500, operations: 9200, other: 8300 },
  { month: 'Mar', total: 86000, staff: 59000, marketing: 9800, operations: 9000, other: 8200 },
  { month: 'Apr', total: 90000, staff: 61500, marketing: 11000, operations: 9500, other: 8000 },
  { month: 'May', total: 92000, staff: 63000, marketing: 11200, operations: 9800, other: 8000 },
  { month: 'Jun', total: 89000, staff: 61000, marketing: 10800, operations: 9400, other: 7800 },
];

export function GeniusView() {
  const isMobile = useIsMobile();
  const { currentView, setCurrentView, agencyId, staffMembers } = useDashboardStore();
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [editKPIOpen, setEditKPIOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchKPI | null>(null);
  const [branchKPIs, setBranchKPIs] = useState<BranchKPI[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loadingKPIs, setLoadingKPIs] = useState(false);

  useEffect(() => {
    if (!agencyId) {
      setBranchKPIs([]);
      setBranches([]);
      return;
    }
    setLoadingKPIs(true);
    Promise.all([
      fetchClientBranchesForAgency(agencyId),
      fetchBranchPerformanceMetrics(agencyId),
    ])
      .then(([branchRows, metrics]) => {
        setBranches((branchRows ?? []).map(b => ({ id: b.id, name: b.name })));
        const kpis: BranchKPI[] = (metrics ?? []).map(m => ({
          branch: m.branchName,
          salesTarget: 0,
          lettingsTarget: 0,
          revenueTarget: 0,
          valuationsTarget: 0,
          currentSales: m.totalSales,
          currentLettings: m.totalLettings,
          currentRevenue: m.totalRevenue,
          currentValuations: m.instructions,
        }));
        setBranchKPIs(kpis);
      })
      .catch(() => {
        setBranchKPIs([]);
        setBranches([]);
      })
      .finally(() => setLoadingKPIs(false));
  }, [agencyId]);

  const filteredKPIs = useMemo(() =>
    selectedBranch === 'all'
      ? branchKPIs
      : branchKPIs.filter(kpi => kpi.branch === selectedBranch),
    [branchKPIs, selectedBranch]
  );

  const totalTargetRevenue = branchKPIs.reduce((sum, kpi) => sum + kpi.revenueTarget, 0);
  const totalCurrentRevenue = branchKPIs.reduce((sum, kpi) => sum + kpi.currentRevenue, 0);
  const totalCosts = costBreakdownData.reduce((sum, item) => sum + item.value, 0);
  const profitMargin = totalCurrentRevenue > 0
    ? ((totalCurrentRevenue - totalCosts) / totalCurrentRevenue * 100).toFixed(1)
    : '0';

  const subNavItems = [
    { id: 'genius-performance-calculator', label: 'Performance Calculator', icon: TargetIcon },
    { id: 'genius-weekly-snapshot', label: 'Weekly Snapshot', icon: BarChart2Icon },
    { id: 'genius-calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'genius-kpis', label: 'KPI\'s', icon: GaugeIcon },
    { id: 'genius-staff-kpis', label: 'Staff KPI\'s', icon: UsersIcon },
    { id: 'genius-branch-kpis', label: 'Branch KPI\'s', icon: Building2Icon },
    { id: 'genius-set-targets', label: 'Set Targets', icon: TargetIcon },
  ];

  const renderGeniusContent = () => {
    switch (currentView) {
      case 'genius-performance-calculator':
        return <GeniusPerformanceView />;
      case 'genius-weekly-snapshot':
        return (
          <WeeklySnapshotView
            selectedStaffId={selectedStaffId}
            setSelectedStaffId={setSelectedStaffId}
            selectedBranchId={selectedBranch}
            setSelectedBranchId={setSelectedBranch}
          />
        );
      case 'genius-calendar':
        return <CalendarView agencyId={agencyId ?? undefined} />;
      case 'genius-kpis':
        return <KPIsView />;
      case 'genius-branch-kpis':
        return <div className="p-6 text-muted-foreground">Branch KPIs Coming Soon!</div>;
      case 'genius-set-targets':
        return <SetTargetsView />;
      case 'genius-staff-kpis':
        return <StaffKPIsView />;
      default:
        return (
          <div className="space-y-8">
            <Tabs defaultValue="ai-simulator" className="w-full">
              <div className="w-full overflow-x-auto pb-2 mb-6">
                <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0 mx-auto">
                  <TabsTrigger 
                    value="ai-simulator" 
                    className="px-4 py-2 text-sm rounded-lg border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:bg-accent hover:text-accent-foreground transition-all font-medium text-muted-foreground"
                  >
                    AI Simulator
                  </TabsTrigger>
                  <TabsTrigger 
                    value="performance-simulator" 
                    className="px-4 py-2 text-sm rounded-lg border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:bg-accent hover:text-accent-foreground transition-all font-medium text-muted-foreground"
                  >
                    Performance Simulator
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai-forecasts" 
                    className="px-4 py-2 text-sm rounded-lg border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:bg-accent hover:text-accent-foreground transition-all font-medium text-muted-foreground"
                  >
                    AI Forecasts
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="ai-simulator">
                <GeniusAIView />
              </TabsContent>
              <TabsContent value="performance-simulator">
                <GeniusPerformanceView />
              </TabsContent>
              <TabsContent value="ai-forecasts">
                <ForecastingView showBackButton={false} />
              </TabsContent>
            </Tabs>
          </div>
        );
    }
  };

  const handleEditKPI = (branch: BranchKPI) => {
    setEditingBranch({ ...branch });
    setEditKPIOpen(true);
  };

  const handleSaveKPI = () => {
    console.log('Saving KPI:', editingBranch);
    setEditKPIOpen(false);
    setEditingBranch(null);
  };

  return (
    <div className={cn("space-y-4 relative z-10", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Render content based on active sub-menu item */}
      {renderGeniusContent()}

      {/* Cost Analytics Section (conditionally rendered based on overall Genius view) */}
      {currentView === 'genius' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cost Breakdown Pie Chart */}
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-purple-500" strokeWidth={1.5} />
                Cost Breakdown
              </CardTitle>
              <p className="text-sm text-muted-foreground">Distribution of operational costs</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))'
                    }}
                    formatter={(value: number) => `£${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {costBreakdownData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">
                        £{item.value.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Cost Trend */}
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5 text-green-500" strokeWidth={1.5} />
                Monthly Cost Trend
              </CardTitle>
              <p className="text-sm text-muted-foreground">Track cost changes over time</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyCostTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))'
                    }}
                    formatter={(value: number) => `£${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#4169E1"
                    strokeWidth={3}
                    name="Total Costs"
                    dot={{ fill: '#4169E1', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="staff"
                    stroke="#9370DB"
                    strokeWidth={2}
                    name="Staff Costs"
                    dot={{ fill: '#9370DB', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="marketing"
                    stroke="#FFB800"
                    strokeWidth={2}
                    name="Marketing"
                    dot={{ fill: '#FFB800', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit KPI Dialog */}
      <Dialog open={editKPIOpen} onOpenChange={setEditKPIOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">
              Edit KPI Targets - {editingBranch?.branch}
            </DialogTitle>
          </DialogHeader>

          {editingBranch && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sales-target">
                  Sales Target
                </Label>
                <Input
                  id="sales-target"
                  type="number"
                  value={editingBranch.salesTarget}
                  onChange={(e) => setEditingBranch({ ...editingBranch, salesTarget: parseInt(e.target.value) })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lettings-target">
                  Lettings Target
                </Label>
                <Input
                  id="lettings-target"
                  type="number"
                  value={editingBranch.lettingsTarget}
                  onChange={(e) => setEditingBranch({ ...editingBranch, lettingsTarget: parseInt(e.target.value) })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue-target">
                  Revenue Target (£)
                </Label>
                <Input
                  id="revenue-target"
                  type="number"
                  value={editingBranch.revenueTarget}
                  onChange={(e) => setEditingBranch({ ...editingBranch, revenueTarget: parseInt(e.target.value) })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valuations-target">
                  Valuations Target
                </Label>
                <Input
                  id="valuations-target"
                  type="number"
                  value={editingBranch.valuationsTarget}
                  onChange={(e) => setEditingBranch({ ...editingBranch, valuationsTarget: parseInt(e.target.value) })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setEditKPIOpen(false)}
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Cancel
            </Button>
            <Button
              onClick={handleSaveKPI}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <SaveIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Save Targets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
