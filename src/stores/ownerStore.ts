import { create } from 'zustand';

export type OwnerViewType = 
  | 'clients' 
  | 'create-order' 
  | 'prospects' 
  | 'analytics' 
  | 'passwords' 
  | 'billing' 
  | 'client-updates'
  | 'compliance-tasks-list'
  | 'holiday-requests'
  | 'absence-bookings'
  | 'staff-reviews'
  | 'staff-assessments'
  | 'document-uploads'
  | 'business-manager'
  | 'base-camp'
  | 'stationery-request'
  | 'invoice-generator'
  | 'invoice-template'
  | 'compliance-documents'
  | 'house-keeping';

interface OwnerState {
  currentView: OwnerViewType;
  isOpen: boolean; // Re-introduce isOpen state
  setCurrentView: (view: OwnerViewType) => void;
  setIsOpen: (open: boolean) => void; // Re-introduce setIsOpen action
}

export const useOwnerStore = create<OwnerState>((set) => ({
  currentView: 'clients',
  // For owners we want to start on the Owner dashboard. "Login as client" will
  // temporarily set this to false so App shows the client dashboard instead.
  isOpen: true,
  setCurrentView: (view) => set({ currentView: view }),
  setIsOpen: (open) => set({ isOpen: open, currentView: 'clients' }), // Reset to clients when (re)opening
}));
