import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { ProspectingStatus } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProspectStatusBadgeProps {
  status: ProspectingStatus;
  prospectId: string;
  onStatusChange?: (prospectId: string, newStatus: ProspectingStatus) => void;
}

const statusConfig: Record<ProspectingStatus, { label: string; className: string }> = {
  canvassed: {
    label: 'Canvassed',
    className: 'bg-indigo-600 text-white hover:bg-indigo-700',
  },
  'not-available': {
    label: 'Not Available',
    className: 'bg-gray-600 text-white hover:bg-gray-700',
  },
  opportunities: {
    label: 'Opportunities',
    className: 'bg-amber-500 text-white hover:bg-amber-600',
  },
  'potential-seller': {
    label: 'Potential Seller',
    className: 'bg-fuchsia-600 text-white hover:bg-fuchsia-700',
  },
  'sold-oa': {
    label: 'Sold OA',
    className: 'bg-rose-600 text-white hover:bg-rose-700',
  },
  valuation: {
    label: 'Valuation',
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
};

const allProspectingStatuses: ProspectingStatus[] = [
  'canvassed',
  'not-available',
  'opportunities',
  'potential-seller',
  'sold-oa',
  'valuation',
];

export function ProspectStatusBadge({ status, prospectId, onStatusChange }: ProspectStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[status] || statusConfig['canvassed'];

  const handleStatusChange = (newStatus: ProspectingStatus) => {
    if (onStatusChange) {
      onStatusChange(prospectId, newStatus);
    }
    setOpen(false);
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center justify-center relative rounded-md px-3 py-1 text-xs font-medium transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-[130px] shadow-sm',
            config.className
          )}
          onClick={(e) => e.stopPropagation()} // Prevent row click
        >
          <span className="text-center truncate px-2">{config.label}</span>
          <ChevronDownIcon className="h-3 w-3 opacity-60 absolute right-2" strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-popover text-popover-foreground max-h-[400px] overflow-y-auto w-[220px]">
        {allProspectingStatuses.map((statusOption) => {
          const optionConfig = statusConfig[statusOption];
          return (
            <DropdownMenuItem
              key={statusOption}
              onClick={() => handleStatusChange(statusOption)}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <span
                className={cn(
                  'mr-2 inline-block h-2 w-2 rounded-sm',
                  optionConfig.className
                )}
              />
              {optionConfig.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
