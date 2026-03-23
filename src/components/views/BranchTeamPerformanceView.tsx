import { useMemo, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TargetIcon, 
  CheckCircle2Icon,
  AlertCircleIcon,
  PlusIcon,
  MoreVerticalIcon,
  CalendarIcon,
  UsersIcon,
  TrendingUpIcon,
  ArrowUpIcon,
  Loader2Icon,
  Trash2Icon,
  EditIcon
} from 'lucide-react';
import { 
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useBranchGoalsStore, BranchGoal, GoalType, GoalPriority } from '@/stores/branchGoalsStore';
import { format, addMonths } from 'date-fns';

interface BranchTeamPerformanceViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

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

export function BranchTeamPerformanceView({ agencyId, branchId, branchName }: BranchTeamPerformanceViewProps = {}) {
  const isMobile = useIsMobile();
  const { movements, loadingMovements, dateRange } = useDashboardStore();
  const { 
    goals, 
    summary, 
    isLoading: loadingGoals, 
    fetchGoals, 
    createGoal, 
    deleteGoal,
    computeAutoTrackedGoals 
  } = useBranchGoalsStore();

  // Dialog state for adding new goals
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
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

  // Fetch goals from database
  useEffect(() => {
    if (agencyId) {
      fetchGoals(agencyId, branchId);
    }
  }, [agencyId, branchId, fetchGoals]);

  // Update auto-tracked goals when movements change
  useEffect(() => {
    if (goals.length > 0 && movements.length > 0) {
      computeAutoTrackedGoals(movements, branchName);
    }
  }, [movements, branchName, goals.length, computeAutoTrackedGoals]);

  // Compute performance radar data from movements
  const performanceRadarData = useMemo(() => {
    let filtered = movements;
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

    const totalRevenue = filtered.reduce((sum, m) => sum + (m.feeAmount ?? 0), 0);
    const valuations = filtered.filter(m => m.status === 'valuation').length;
    const completedDeals = filtered.filter(m => m.status === 'completed' || m.status === 'exchanged' || m.status === 'sale').length;
    const totalMovements = filtered.length;

    // Use goals for targets if available, otherwise use defaults
    const revenueGoal = goals.find(g => g.goal_type === 'revenue');
    const instructionsGoal = goals.find(g => g.goal_type === 'instructions' || g.goal_type === 'valuations');
    
    const revenueTarget = revenueGoal?.target_value || Math.max(100000, Math.round(totalRevenue * 1.1));
    const instructionTarget = instructionsGoal?.target_value || Math.max(10, Math.round(valuations * 1.2));

    const revenueScore = revenueTarget > 0 ? Math.min(100, Math.round((totalRevenue / revenueTarget) * 100)) : 0;
    const conversionScore = totalMovements > 0 ? Math.round((completedDeals / totalMovements) * 100) : 0;
    const instructionScore = instructionTarget > 0 ? Math.min(100, Math.round((valuations / instructionTarget) * 100)) : 0;
    const efficiencyScore = totalMovements > 0 ? Math.min(100, Math.round((completedDeals / totalMovements) * 120)) : 0;
    const dataQuality = totalMovements > 0 
      ? Math.round((filtered.filter(m => m.feeAmount && m.price && m.agent).length / totalMovements) * 100)
      : 0;

    return [
      { metric: 'Revenue', current: revenueScore, target: 100 },
      { metric: 'Conversion', current: conversionScore, target: 100 },
      { metric: 'Instructions', current: instructionScore, target: 100 },
      { metric: 'Efficiency', current: efficiencyScore, target: 100 },
      { metric: 'Data Quality', current: dataQuality, target: 100 },
    ];
  }, [movements, branchId, branchName, dateRange, goals]);

  const handleCreateGoal = async () => {
    if (!agencyId || !newGoal.title || newGoal.target_value <= 0) return;

    const created = await createGoal({
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

    setIsAddGoalOpen(false);
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

    if (created) {
      await fetchGoals(agencyId, branchId);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  if (loadingMovements || loadingGoals) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading team performance...</span>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: typeof CheckCircle2Icon; color: string; bg: string; label: string }> = {
      'on-track': { icon: CheckCircle2Icon, color: 'text-green-700', bg: 'bg-green-100', label: 'On Track' },
      'at-risk': { icon: AlertCircleIcon, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'At Risk' },
      'active': { icon: TargetIcon, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Active' },
      'completed': { icon: CheckCircle2Icon, color: 'text-green-700', bg: 'bg-green-100', label: 'Completed' },
    };
    const { icon: Icon, color, bg, label } = config[status] || config['active'];
    
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", bg, color)}>
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className={cn(
        "gap-4",
        isMobile 
          ? "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2" 
          : "grid md:grid-cols-2 lg:grid-cols-4"
      )}>
        <Card className="bg-card text-card-foreground border-2 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Goals On Track</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2Icon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.onTrack}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              of {goals.length} active goals
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-2 border-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">At Risk</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircleIcon className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.atRisk}</div>
            <div className="flex items-center text-xs text-warning mt-1">
              Needs attention
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-2 border-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Overall Progress</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TrendingUpIcon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.overallProgress}%</div>
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Updated from current period
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Radar */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground text-xl">Branch Performance Overview</CardTitle>
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

        {/* Goals List */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-xl">Branch Goals</CardTitle>
              <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!agencyId} title={!agencyId ? 'Branch context required to add goals' : undefined}>
                    <PlusIcon className="h-4 w-4 mr-2" /> Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Goal</DialogTitle>
                    <DialogDescription>
                      Set a new goal to track branch performance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Goal Title</Label>
                      <Input
                        id="title"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                        placeholder="e.g., Q1 Revenue Target"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GOAL_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Priority</Label>
                        <Select
                          value={newGoal.priority}
                          onValueChange={(value: GoalPriority) => setNewGoal({ ...newGoal, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="target">Target Value ({newGoal.unit})</Label>
                        <Input
                          id="target"
                          type="number"
                          value={newGoal.target_value || ''}
                          onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                          placeholder="e.g., 100000"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={newGoal.deadline}
                          onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="owner">Owner</Label>
                      <Input
                        id="owner"
                        value={newGoal.owner_name}
                        onChange={(e) => setNewGoal({ ...newGoal, owner_name: e.target.value })}
                        placeholder="e.g., Branch Manager"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="auto_tracked"
                        checked={newGoal.is_auto_tracked}
                        onChange={(e) => setNewGoal({ ...newGoal, is_auto_tracked: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="auto_tracked" className="text-sm font-normal">
                        Auto-track progress from movements data
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddGoalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGoal} disabled={!agencyId || !newGoal.title || newGoal.target_value <= 0}>
                      Create Goal
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {goals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TargetIcon className="h-12 w-12 mx-auto mb-4 opacity-50" strokeWidth={1.5} />
                <p className="text-lg font-medium text-foreground">No goals set yet</p>
                <p className="text-sm mt-1">Create your first goal using the &quot;Add Goal&quot; button above, or the &quot;Add Goal&quot; button in the page header. Goals you create will appear here and in the summary cards.</p>
                {!agencyId && (
                  <p className="text-xs mt-3 text-amber-600 dark:text-amber-500">Sign in with branch context to add goals.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal: BranchGoal) => {
                  const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
                  return (
                    <div 
                      key={goal.id}
                      className="p-5 rounded-lg border-2 border-border hover:border-primary/50 hover:shadow-md transition-all bg-muted/20"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-lg">{goal.title}</h3>
                            {getStatusBadge(goal.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" strokeWidth={1.5} />
                              Due: {goal.deadline}
                            </span>
                            {goal.owner_name && (
                              <span className="flex items-center gap-1">
                                <UsersIcon className="h-3 w-3" strokeWidth={1.5} />
                                {goal.owner_name}
                              </span>
                            )}
                            {goal.is_auto_tracked && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <TrendingUpIcon className="h-3 w-3" strokeWidth={1.5} />
                                Auto-tracked
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteGoal(goal.id)}>
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              Delete Goal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-foreground">
                            {goal.unit === '£' ? `£${goal.current_value.toLocaleString()}` : goal.current_value}
                            {' / '}
                            {goal.unit === '£' ? `£${goal.target_value.toLocaleString()}` : goal.target_value}
                            {goal.unit !== '£' && ` ${goal.unit}`}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(100, progress)} 
                          className="h-3"
                          indicatorClassName={cn(
                          goal.status === 'on-track' ? 'bg-green-500' : 'bg-yellow-500'
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
