import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

export type GoalType = 'revenue' | 'instructions' | 'completions' | 'lettings' | 'valuations' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'cancelled' | 'at-risk' | 'on-track';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface BranchGoal {
  id: string;
  agency_id: string;
  branch_id: string | null;
  title: string;
  description: string | null;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  deadline: string;
  status: GoalStatus;
  owner_id: string | null;
  owner_name: string | null;
  priority: GoalPriority;
  is_auto_tracked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  agency_id: string;
  branch_id?: string | null;
  title: string;
  description?: string;
  goal_type: GoalType;
  target_value: number;
  current_value?: number;
  unit: string;
  start_date?: string;
  deadline: string;
  owner_id?: string | null;
  owner_name?: string;
  priority?: GoalPriority;
  is_auto_tracked?: boolean;
}

interface BranchGoalsState {
  goals: BranchGoal[];
  isLoading: boolean;
  error: string | null;
  
  // Computed values
  summary: {
    onTrack: number;
    atRisk: number;
    completed: number;
    total: number;
    overallProgress: number;
  };
  
  // Actions
  fetchGoals: (agencyId: string, branchId?: string) => Promise<void>;
  createGoal: (input: CreateGoalInput) => Promise<BranchGoal | null>;
  updateGoal: (goalId: string, updates: Partial<BranchGoal>) => Promise<void>;
  updateGoalProgress: (goalId: string, currentValue: number) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  computeAutoTrackedGoals: (movements: any[], branchName?: string) => void;
  reset: () => void;
}

const computeSummary = (goals: BranchGoal[]) => {
  const activeGoals = goals.filter(g => g.status !== 'cancelled');
  const onTrack = activeGoals.filter(g => g.status === 'on-track').length;
  const atRisk = activeGoals.filter(g => g.status === 'at-risk' || g.status === 'active').length;
  const completed = activeGoals.filter(g => g.status === 'completed').length;
  
  const overallProgress = activeGoals.length > 0
    ? Math.round(
        activeGoals.reduce((sum, g) => {
          const progress = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
          return sum + Math.min(100, progress);
        }, 0) / activeGoals.length
      )
    : 0;

  return {
    onTrack,
    atRisk,
    completed,
    total: activeGoals.length,
    overallProgress,
  };
};

export const useBranchGoalsStore = create<BranchGoalsState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,
  summary: {
    onTrack: 0,
    atRisk: 0,
    completed: 0,
    total: 0,
    overallProgress: 0,
  },

  fetchGoals: async (agencyId: string, branchId?: string) => {
    if (!agencyId) {
      set({ goals: [], isLoading: false, error: null, summary: computeSummary([]) });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      let query = supabase
        .from('branch_goals')
        .select('*')
        .eq('agency_id', agencyId)
        .neq('status', 'cancelled')
        .order('priority', { ascending: false })
        .order('deadline', { ascending: true });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching branch goals:', error);
        set({ goals: [], isLoading: false, error: error.message, summary: computeSummary([]) });
        return;
      }

      const goals = (data as BranchGoal[]) || [];
      set({ 
        goals, 
        isLoading: false, 
        error: null,
        summary: computeSummary(goals)
      });
    } catch (err) {
      console.error('Exception fetching branch goals:', err);
      set({ 
        goals: [], 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
        summary: computeSummary([])
      });
    }
  },

  createGoal: async (input: CreateGoalInput) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('branch_goals')
        .insert([{
          agency_id: input.agency_id,
          branch_id: input.branch_id || null,
          title: input.title,
          description: input.description || null,
          goal_type: input.goal_type,
          target_value: input.target_value,
          current_value: input.current_value || 0,
          unit: input.unit,
          start_date: input.start_date || new Date().toISOString().split('T')[0],
          deadline: input.deadline,
          owner_id: input.owner_id || null,
          owner_name: input.owner_name || null,
          priority: input.priority || 'medium',
          is_auto_tracked: input.is_auto_tracked || false,
        }])
        .select()
        .single();

      if (error) {
        set({ isLoading: false, error: error.message });
        return null;
      }

      const newGoal = data as BranchGoal;
      const { goals } = get();
      const updatedGoals = [...goals, newGoal];
      set({ 
        goals: updatedGoals, 
        isLoading: false, 
        error: null,
        summary: computeSummary(updatedGoals)
      });
      return newGoal;
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
      return null;
    }
  },

  updateGoal: async (goalId: string, updates: Partial<BranchGoal>) => {
    try {
      const { error } = await supabase
        .from('branch_goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal:', error);
        return;
      }

      const { goals } = get();
      const updatedGoals = goals.map(g => 
        g.id === goalId ? { ...g, ...updates } : g
      );
      set({ 
        goals: updatedGoals,
        summary: computeSummary(updatedGoals)
      });
    } catch (err) {
      console.error('Exception updating goal:', err);
    }
  },

  updateGoalProgress: async (goalId: string, currentValue: number) => {
    try {
      const { error } = await supabase
        .from('branch_goals')
        .update({
          current_value: currentValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal progress:', error);
        return;
      }

      const { goals } = get();
      const updatedGoals = goals.map(g => {
        if (g.id !== goalId) return g;
        
        // Compute new status based on progress
        const progress = g.target_value > 0 ? (currentValue / g.target_value) * 100 : 0;
        let newStatus: GoalStatus = g.status;
        
        if (progress >= 100) {
          newStatus = 'completed';
        } else if (progress >= 80) {
          newStatus = 'on-track';
        } else {
          const daysRemaining = Math.ceil(
            (new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          newStatus = daysRemaining < 7 && progress < 50 ? 'at-risk' : 'on-track';
        }
        
        return { ...g, current_value: currentValue, status: newStatus };
      });
      
      set({ 
        goals: updatedGoals,
        summary: computeSummary(updatedGoals)
      });
    } catch (err) {
      console.error('Exception updating goal progress:', err);
    }
  },

  deleteGoal: async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('branch_goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        console.error('Error deleting goal:', error);
        return;
      }

      const { goals } = get();
      const updatedGoals = goals.filter(g => g.id !== goalId);
      set({ 
        goals: updatedGoals,
        summary: computeSummary(updatedGoals)
      });
    } catch (err) {
      console.error('Exception deleting goal:', err);
    }
  },

  computeAutoTrackedGoals: (movements: any[], branchName?: string) => {
    const { goals } = get();
    
    // Filter movements by branch if specified
    let filtered = movements;
    if (branchName) {
      filtered = movements.filter(m => m.branch === branchName);
    }

    // Compute metrics from movements
    const totalRevenue = filtered.reduce((sum, m) => sum + (m.feeAmount ?? 0), 0);
    const completedDeals = filtered.filter(m => 
      m.status === 'completed' || m.status === 'exchanged' || m.status === 'sale'
    ).length;
    const valuations = filtered.filter(m => m.status === 'valuation').length;
    const lettingsRevenue = filtered
      .filter(m => m.type === 'letting')
      .reduce((sum, m) => sum + (m.feeAmount ?? 0), 0);

    // Update auto-tracked goals with computed values
    const updatedGoals = goals.map(goal => {
      if (!goal.is_auto_tracked) return goal;

      let newCurrentValue = goal.current_value;
      
      switch (goal.goal_type) {
        case 'revenue':
          newCurrentValue = totalRevenue;
          break;
        case 'completions':
          newCurrentValue = completedDeals;
          break;
        case 'instructions':
        case 'valuations':
          newCurrentValue = valuations;
          break;
        case 'lettings':
          newCurrentValue = lettingsRevenue;
          break;
      }

      // Compute status
      const progress = goal.target_value > 0 ? (newCurrentValue / goal.target_value) * 100 : 0;
      let newStatus: GoalStatus = goal.status;
      
      if (progress >= 100) {
        newStatus = 'completed';
      } else if (progress >= 80) {
        newStatus = 'on-track';
      } else {
        const daysRemaining = Math.ceil(
          (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        newStatus = daysRemaining < 14 && progress < 50 ? 'at-risk' : 'on-track';
      }

      return {
        ...goal,
        current_value: newCurrentValue,
        status: newStatus,
      };
    });

    set({ 
      goals: updatedGoals,
      summary: computeSummary(updatedGoals)
    });
  },

  reset: () => {
    set({ 
      goals: [], 
      isLoading: false, 
      error: null,
      summary: computeSummary([])
    });
  },
}));
