import { create } from 'zustand';

export interface MileageLog {
  id: string;
  eventId: string;
  date: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  isReturnTrip: boolean;
  totalDistance: number;
  staffName: string;
}

interface MileageState {
  logs: MileageLog[];
  addLog: (log: Omit<MileageLog, 'id'>) => void;
  deleteLog: (id: string) => void;
}

export const useMileageStore = create<MileageState>((set) => ({
  logs: [
    {
      id: 'log-1',
      eventId: 'evt-1',
      date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      startLocation: 'Office',
      endLocation: '123 High St, London',
      distance: 5.2,
      isReturnTrip: true,
      totalDistance: 10.4,
      staffName: 'Sarah Johnson'
    },
    {
      id: 'log-2',
      eventId: 'evt-2',
      date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
      startLocation: 'Office',
      endLocation: '45 Park Lane, Manchester',
      distance: 12.5,
      isReturnTrip: true,
      totalDistance: 25.0,
      staffName: 'Michael Brown'
    }
  ],
  addLog: (log) => set((state) => ({
    logs: [{ ...log, id: `log-${Date.now()}` }, ...state.logs]
  })),
  deleteLog: (id) => set((state) => ({
    logs: state.logs.filter(log => log.id !== id)
  })),
}));
