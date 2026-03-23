import { ViewType } from '@/stores/dashboardStore';
import { BranchManagerViewType } from '@/stores/branchManagerStore';
import { NegotiatorViewType } from '@/stores/negotiatorStore';
import { OwnerViewType } from '@/stores/ownerStore';

// Define a union type for all possible view IDs across dashboards
export type AllViewTypes = ViewType | BranchManagerViewType | NegotiatorViewType | OwnerViewType;

// Define specific colors for each icon when inactive
export const globalIconColors: Record<AllViewTypes, string> = {
  // Main Dashboard ViewTypes
  movements: 'text-blue-500',
  prospecting: 'text-green-500',
  'business-analytics': 'text-purple-500',
  'business-manager': 'text-indigo-600',
  'branch-league-table': 'text-orange-500',
  staff: 'text-red-500',
  branches: 'text-yellow-500',
  'buyers-sellers': 'text-indigo-500',
  tasks: 'text-pink-500',
  'team-chat': 'text-indigo-500',
  'grip-dash': 'text-cyan-500',
  settings: 'text-gray-500',
  overview: 'text-gray-500',

  // Branch Manager Dashboard ViewTypes (some overlap with main)
  'branch-analytics': 'text-orange-500',

  // Negotiator Dashboard ViewTypes (some overlap with main)
  'my-analytics': 'text-teal-500',

  // Owner Dashboard ViewTypes
  clients: 'text-emerald-500',
  'create-order': 'text-lime-500',
  prospects: 'text-purple-500',
  analytics: 'text-fuchsia-500',
  passwords: 'text-rose-500',
  billing: 'text-violet-500',
  'client-updates': 'text-amber-500',
  'base-camp': 'text-orange-400',
  'stationery-request': 'text-blue-400', // New color
  'invoice-generator': 'text-green-400',  // New color
  'invoice-template': 'text-purple-400', // New color

  // House Keeping color (now shared across Negotiator and Branch Manager)
  'house-keeping': 'text-gray-500',

  // Prospector Dashboard ViewTypes
  'prospector-dash': 'text-indigo-400',
  'prospecting-analytics': 'text-teal-400',

  // Genius Sub-menu ViewTypes
  genius: 'text-purple-500',
  'genius-performance-calculator': 'text-blue-500',
  'genius-calendar': 'text-green-600',
  'genius-kpis': 'text-orange-500',
  'genius-branch-kpis': 'text-indigo-500',
  'genius-weekly-snapshot': 'text-yellow-500',
  'genius-branch-performance-summary': 'text-cyan-500',
  'genius-staff-performance-summary': 'text-orange-400',
  'genius-set-targets': 'text-purple-600',

  // Data Uploads
  'data-upload': 'text-purple-600',
  'lead-gen-upload': 'text-pink-600',
  'general-settings': 'text-blue-500',
  'branch-management': 'text-indigo-600',
};
