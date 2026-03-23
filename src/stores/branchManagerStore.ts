import { create } from 'zustand';

export type BranchManagerViewType = 'movements' | 'genius-calendar' | 'prospecting' | 'branch-analytics' | 'branch-management' | 'buyers-sellers' | 'tasks' | 'team-chat' | 'genius' | 'house-keeping' | 'staff' | 'branches' | 'commissions';

interface BranchManagerState {
  currentView: BranchManagerViewType;
  selectedStaffMember: {
    id: string;
    name: string;
    role: string;
    branch: string;
  } | null;
  setCurrentView: (view: BranchManagerViewType) => void;
  setSelectedStaffMember: (staff: { id: string; name: string; role: string; branch: string } | null) => void;
}

export const useBranchManagerStore = create<BranchManagerState>((set) => ({
  currentView: 'movements',
  selectedStaffMember: null,
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedStaffMember: (staff) => set({ selectedStaffMember: staff, currentView: 'movements' }),
}));
