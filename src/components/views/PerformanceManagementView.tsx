import { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  TargetIcon, 
  TrendingUpIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  CalendarIcon,
  UsersIcon,
  Building2Icon,
  PoundSterlingIcon,
  PercentIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SaveIcon,
  XIcon
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { DateRangePicker } from '../DateRangePicker';
import { BranchSelect } from '../BranchSelect';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboardStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { confirmDialog } from '@/hooks/use-confirm';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'revenue' | 'sales' | 'efficiency' | 'growth';
  target: number;
  current: number;
  unit: string;
  deadline: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
}

interface ActionPlan {
  id: string;
  goalId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

// Initial action plans - these are user-managed tasks linked to goals
const initialActionPlans: ActionPlan[] = [];

export function PerformanceManagementView() {
  const isMobile = useIsMobile();
  const { filteredMovements } = useDashboardStore();
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Calculate dynamic goals from movements
  const { dynamicGoals, performanceRadarData, goalProgressData, overallProgress, revenueChangePercent } = useMemo(() => {
    const totalRevenue = filteredMovements.reduce((sum, m) => sum + (m.feeAmount || 0), 0);
    const completedSales = filteredMovements.filter(m => m.type === 'sale' && m.status === 'completed').length;
    const totalMovements = filteredMovements.length;
    const valuations = filteredMovements.filter(m => m.status === 'valuation').length;
    const conversionRate = valuations > 0 ? (completedSales / valuations) * 100 : 0;
    const abortRate = totalMovements > 0 ? (filteredMovements.filter(m => m.status === 'abort').length / totalMovements) * 100 : 0;

    // Calculate progress percentages
    const revenueProgress = Math.min((totalRevenue / 3000000) * 100, 100);
    const conversionProgress = Math.min(conversionRate, 100);
    const salesProgress = Math.min((completedSales / 500) * 100, 100);
    const efficiencyProgress = Math.max(100 - abortRate, 0);

    const dynamicGoals: Goal[] = [
      {
        id: 'g1',
        title: 'Increase Annual Revenue',
        description: 'Achieve £3M in total revenue by end of year',
        category: 'revenue',
        target: 3000000,
        current: Math.round(totalRevenue),
        unit: '£',
        deadline: '2025-12-31',
        owner: 'Sarah Johnson',
        status: totalRevenue >= 3000000 ? 'achieved' : totalRevenue >= 2250000 ? 'on-track' : 'at-risk',
      },
      {
        id: 'g2',
        title: 'Improve Conversion Rate',
        description: 'Increase valuation to instruction conversion to 65%',
        category: 'efficiency',
        target: 65,
        current: Math.round(conversionRate * 10) / 10,
        unit: '%',
        deadline: '2025-06-30',
        owner: 'Michael Brown',
        status: conversionRate >= 65 ? 'achieved' : conversionRate >= 55 ? 'on-track' : 'at-risk',
      },
      {
        id: 'g3',
        title: 'Total Deals Completed',
        description: 'Complete 500 deals this year',
        category: 'sales',
        target: 500,
        current: completedSales,
        unit: 'deals',
        deadline: '2025-12-31',
        owner: 'Emma Wilson',
        status: completedSales >= 500 ? 'achieved' : completedSales >= 375 ? 'on-track' : 'behind',
      },
      {
        id: 'g4',
        title: 'Reduce Abort Rate',
        description: 'Lower abort rate from 18% to 12%',
        category: 'efficiency',
        target: 12,
        current: Math.round(abortRate * 10) / 10,
        unit: '%',
        deadline: '2025-08-31',
        owner: 'David Lee',
        status: abortRate <= 12 ? 'achieved' : abortRate <= 15 ? 'on-track' : 'behind',
      },
    ];

    // Customer satisfaction based on completion success rate (completed vs aborted)
    const successfulDeals = filteredMovements.filter(m => m.status === 'completed' || m.status === 'exchanged').length;
    const failedDeals = filteredMovements.filter(m => m.status === 'abort').length;
    const customerSatScore = (successfulDeals + failedDeals) > 0 
      ? Math.round((successfulDeals / (successfulDeals + failedDeals)) * 100)
      : 85; // default if no data

    const performanceRadarData = [
      { metric: 'Revenue', current: Math.round(revenueProgress), target: 100 },
      { metric: 'Conversion', current: Math.round(conversionProgress), target: 100 },
      { metric: 'Sales', current: Math.round(salesProgress), target: 100 },
      { metric: 'Efficiency', current: Math.round(efficiencyProgress), target: 100 },
      { metric: 'Customer Sat', current: customerSatScore, target: 100 },
    ];

    const goalProgressData = [
      { category: 'Revenue', achieved: Math.round(revenueProgress), remaining: Math.max(100 - Math.round(revenueProgress), 0) },
      { category: 'Sales', achieved: Math.round(salesProgress), remaining: Math.max(100 - Math.round(salesProgress), 0) },
      { category: 'Conversion', achieved: Math.round(conversionProgress), remaining: Math.max(100 - Math.round(conversionProgress), 0) },
      { category: 'Efficiency', achieved: Math.round(efficiencyProgress), remaining: Math.max(100 - Math.round(efficiencyProgress), 0) },
    ];

    // overall progress is average of key progress metrics
    const overallProgress = Math.round((revenueProgress + conversionProgress + salesProgress + efficiencyProgress) / 4);

    // simple month-over-month revenue change (last 30 days vs previous 30 days)
    const now = Date.now();
    const THIRTY = 30 * 24 * 60 * 60 * 1000;
    const currentPeriodStart = new Date(now - THIRTY);
    const prevPeriodStart = new Date(now - 2 * THIRTY);

    const currentRevenue = filteredMovements
      .filter(m => new Date(m.date) >= currentPeriodStart)
      .reduce((s, m) => s + (m.feeAmount || 0), 0);
    const prevRevenue = filteredMovements
      .filter(m => new Date(m.date) >= prevPeriodStart && new Date(m.date) < currentPeriodStart)
      .reduce((s, m) => s + (m.feeAmount || 0), 0);

    const revenueChangePercent = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return { dynamicGoals, performanceRadarData, goalProgressData, overallProgress, revenueChangePercent };
  }, [filteredMovements]);

  const [userAddedGoals, setUserAddedGoals] = useState<Goal[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(initialActionPlans);

  // Combine dynamic goals with user-added goals
  const goals = useMemo(() => {
    return [...dynamicGoals, ...userAddedGoals];
  }, [dynamicGoals, userAddedGoals]);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'revenue' as Goal['category'],
    target: 0,
    unit: '£',
    deadline: '',
    owner: '',
  });

  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as ActionPlan['priority'],
  });

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.target || !newGoal.deadline) {
      alert('Please fill in all required fields');
      return;
    }

    const goal: Goal = {
      id: `g${Date.now()}`,
      ...newGoal,
      current: 0,
      status: 'on-track',
    };

    setUserAddedGoals([...userAddedGoals, goal]);
    setNewGoal({
      title: '',
      description: '',
      category: 'revenue',
      target: 0,
      unit: '£',
      deadline: '',
      owner: '',
    });
    setAddGoalOpen(false);
  };

  const handleAddAction = () => {
    if (!selectedGoalId || !newAction.title || !newAction.dueDate) {
      alert('Please select a goal and fill in required fields');
      return;
    }

    const action: ActionPlan = {
      id: `a${Date.now()}`,
      goalId: selectedGoalId,
      ...newAction,
      status: 'not-started',
    };

    setActionPlans([...actionPlans, action]);
    setNewAction({
      title: '',
      description: '',
      assignedTo: '',
      dueDate: '',
      priority: 'medium',
    });
    setAddActionOpen(false);
  };

  const handleDeleteGoal = async (id: string) => {
    const ok = await confirmDialog('Are you sure you want to delete this goal?', {
      title: 'Delete goal?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    // Only allow deleting user-added goals (not the default dynamic ones)
    if (id.startsWith('g') && !isNaN(parseInt(id.substring(1)))) {
      // This is a default dynamic goal - don't delete
      return;
    }
    setUserAddedGoals(userAddedGoals.filter(g => g.id !== id));
    setActionPlans(actionPlans.filter(a => a.goalId !== id));
  };

  const getStatusBadge = (status: Goal['status']) => {
    const config = {
      'on-track': { icon: CheckCircle2Icon, color: 'text-green-700', bg: 'bg-green-100', label: 'On Track' },
      'at-risk': { icon: AlertCircleIcon, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'At Risk' },
      'behind': { icon: AlertCircleIcon, color: 'text-red-700', bg: 'bg-red-100', label: 'Behind' },
      'achieved': { icon: CheckCircle2Icon, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Achieved' },
    };
    const { icon: Icon, color, bg, label } = config[status];
    
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", bg, color)}>
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </span>
    );
  };

  const getCategoryIcon = (category: Goal['category']) => {
    switch (category) {
      case 'revenue': return PoundSterlingIcon;
      case 'sales': return TrendingUpIcon;
      case 'efficiency': return PercentIcon;
      case 'growth': return UsersIcon;
    }
  };

  return (
    <div className={cn("space-y-6", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <TargetIcon className="h-8 w-8 text-purple-600" strokeWidth={1.5} />
            Performance Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Set strategic goals, create action plans, and track progress
          </p>
        </div>

        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={() => setAddGoalOpen(true)}
        >
          <PlusIcon className="h-5 w-5" strokeWidth={1.5} />
          Add Goal
        </Button>
      </div>

      {/* Overview Cards */}
      <div className={cn(
        "gap-4",
        isMobile 
          ? "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2" 
          : "grid md:grid-cols-2 lg:grid-cols-4"
      )}>
        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-green-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Goals On Track</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2Icon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {goals.filter(g => g.status === 'on-track').length}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              of {goals.length} total goals
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-yellow-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">At Risk</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircleIcon className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {goals.filter(g => g.status === 'at-risk').length}
            </div>
            <div className="flex items-center text-xs text-warning mt-1">
              Needs attention
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-blue-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Action Plans</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CheckCircle2Icon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {actionPlans.filter(a => a.status === 'completed').length}/{actionPlans.length}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Completed
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-purple-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Overall Progress</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TrendingUpIcon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overallProgress}%</div>
            <div className={cn("flex items-center text-xs mt-1", revenueChangePercent >= 0 ? 'text-success' : 'text-destructive')}>
              {revenueChangePercent >= 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" strokeWidth={2} /> : <ArrowDownIcon className="h-3 w-3 mr-1" strokeWidth={2} />}
              {`${revenueChangePercent >= 0 ? '+' : ''}${revenueChangePercent.toFixed(1)}% this month`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Radar & Progress Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Radar */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground text-xl">Performance Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Current vs target across key metrics</p>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceRadarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar 
                  name="Current" 
                  dataKey="current" 
                  stroke="#4169E1" 
                  fill="#4169E1" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar 
                  name="Target" 
                  dataKey="target" 
                  stroke="#2E8B57" 
                  fill="#2E8B57" 
                  fillOpacity={0.1}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Legend />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goal Progress by Category */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground text-xl">Goal Progress by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Achievement rates across different goal types</p>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={goalProgressData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => `${value}%`}
                />
                <Legend />
                <Bar dataKey="achieved" stackId="a" fill="#4169E1" name="Achieved" radius={[0, 4, 4, 0]} />
                <Bar dataKey="remaining" stackId="a" fill="#E5E7EB" name="Remaining" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card className="bg-card text-card-foreground border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-xl">Strategic Goals</CardTitle>
              <p className="text-sm text-muted-foreground">Track progress towards your business objectives</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {goals.map((goal) => {
              const CategoryIcon = getCategoryIcon(goal.category);
              const progress = (goal.current / goal.target) * 100;
              const relatedActions = actionPlans.filter(a => a.goalId === goal.id);

              return (
                <div 
                  key={goal.id}
                  className="p-5 rounded-lg border-2 border-border hover:border-primary/50 hover:shadow-md transition-all bg-muted/20"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <CategoryIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-lg">{goal.title}</h3>
                          {getStatusBadge(goal.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" strokeWidth={1.5} />
                            Due: {new Date(goal.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" strokeWidth={1.5} />
                            {goal.owner}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingGoal(goal)}>
                          <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Edit Goal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedGoalId(goal.id);
                          setAddActionOpen(true);
                        }}>
                          <PlusIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Add Action Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-foreground">
                        {goal.unit === '£' ? `£${goal.current.toLocaleString()}` : goal.current}
                        {' / '}
                        {goal.unit === '£' ? `£${goal.target.toLocaleString()}` : goal.target}
                        {goal.unit !== '£' && goal.unit}
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className="h-3"
                      indicatorClassName={cn(
                        goal.status === 'on-track' || goal.status === 'achieved' ? 'bg-green-500' :
                        goal.status === 'at-risk' ? 'bg-yellow-500' :
                        'bg-red-500'
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.toFixed(1)}% complete
                    </p>
                  </div>

                  {/* Related Action Plans */}
                  {relatedActions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Action Plans ({relatedActions.length})
                      </p>
                      {relatedActions.map((action) => (
                        <div 
                          key={action.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
                        >
                          <input 
                            type="checkbox" 
                            checked={action.status === 'completed'}
                            onChange={() => {
                              setActionPlans(prev => prev.map(a => 
                                a.id === action.id 
                                  ? { ...a, status: a.status === 'completed' ? 'in-progress' : 'completed' }
                                  : a
                              ));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium",
                              action.status === 'completed' ? "line-through text-muted-foreground" : "text-foreground"
                            )}>
                              {action.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{action.assignedTo}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(action.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full shrink-0",
                            action.priority === 'high' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            action.priority === 'medium' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {action.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add Goal Dialog */}
      <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Create New Goal</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal Title<span className="text-destructive">*</span></Label>
              <Input
                id="goal-title"
                placeholder="e.g., Increase Annual Revenue"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-description">Description</Label>
              <Textarea
                id="goal-description"
                placeholder="Describe the goal and why it's important..."
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                className="bg-background min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-category">Category<span className="text-destructive">*</span></Label>
                <Select
                  value={newGoal.category}
                  onValueChange={(value: Goal['category']) => setNewGoal({ ...newGoal, category: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="efficiency">Efficiency</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-owner">Goal Owner</Label>
                <Input
                  id="goal-owner"
                  placeholder="Person responsible"
                  value={newGoal.owner}
                  onChange={(e) => setNewGoal({ ...newGoal, owner: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target<span className="text-destructive">*</span></Label>
                <Input
                  id="goal-target"
                  type="number"
                  placeholder="100"
                  value={newGoal.target || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, target: parseFloat(e.target.value) || 0 })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-unit">Unit</Label>
                <Select
                  value={newGoal.unit}
                  onValueChange={(value) => setNewGoal({ ...newGoal, unit: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="£">£ (Currency)</SelectItem>
                    <SelectItem value="%">% (Percentage)</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="hires">Hires</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-deadline">Deadline<span className="text-destructive">*</span></Label>
                <Input
                  id="goal-deadline"
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGoal} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <SaveIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Action Plan Dialog */}
      <Dialog open={addActionOpen} onOpenChange={setAddActionOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Create Action Plan</DialogTitle>
            <p className="text-sm text-muted-foreground">
              For goal: {goals.find(g => g.id === selectedGoalId)?.title}
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-title">Action Title<span className="text-destructive">*</span></Label>
              <Input
                id="action-title"
                placeholder="e.g., Launch marketing campaign"
                value={newAction.title}
                onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-description">Description</Label>
              <Textarea
                id="action-description"
                placeholder="Describe the action steps..."
                value={newAction.description}
                onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                className="bg-background min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action-assigned">Assigned To</Label>
                <Input
                  id="action-assigned"
                  placeholder="Person or team"
                  value={newAction.assignedTo}
                  onChange={(e) => setNewAction({ ...newAction, assignedTo: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-due">Due Date<span className="text-destructive">*</span></Label>
                <Input
                  id="action-due"
                  type="date"
                  value={newAction.dueDate}
                  onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newAction.priority}
                onValueChange={(value: ActionPlan['priority']) => setNewAction({ ...newAction, priority: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddActionOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAction} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <SaveIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Create Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
