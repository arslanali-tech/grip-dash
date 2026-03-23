import { create } from 'zustand';

export type NegotiatorViewType = 'movements' | 'genius-calendar' | 'prospecting' | 'my-analytics' | 'buyers-sellers' | 'tasks' | 'team-chat' | 'genius' | 'house-keeping' | 'staff' | 'branches';

interface NegotiatorState {
  currentView: NegotiatorViewType;
  selectedStaffMember: {
    id: string;
    name: string;
    role: string;
    branch: string;
  } | null;
  setCurrentView: (view: NegotiatorViewType) => void;
  setSelectedStaffMember: (staff: { id: string; name: string; role: string; branch: string } | null) => void;
}

export const useNegotiatorStore = create<NegotiatorState>((set) => ({
  currentView: 'movements',
  selectedStaffMember: null,
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedStaffMember: (staff) => set({ selectedStaffMember: staff, currentView: 'movements' }),
}));
