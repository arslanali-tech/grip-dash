import { create } from 'zustand';

export type ProspectorViewType = 'prospecting' | 'prospecting-analytics' | 'house-keeping' | 'team-chat';

interface ProspectorState {
  currentView: ProspectorViewType;
  selectedStaffMember: {
    id: string;
    name: string;
    role: string;
    branch: string;
  } | null;
  setCurrentView: (view: ProspectorViewType) => void;
  setSelectedStaffMember: (staff: { id: string; name: string; role: string; branch: string } | null) => void;
}

export const useProspectorStore = create<ProspectorState>((set) => ({
  currentView: 'prospecting', // Default view for Prospector
  selectedStaffMember: null, // Can be set if a specific prospector is selected
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedStaffMember: (staff) => set({ selectedStaffMember: staff, currentView: 'prospecting' }),
}));
