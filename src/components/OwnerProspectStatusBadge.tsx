import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type OwnerProspectStatus = 
  | 'prospect' 
  | 'called' 
  | 'emailed' 
  | 'direct-mail' 
  | 'walked-in'
  | 'zoom-meeting' 
  | 'meeting' 
  | 'sent-order-form' 
  | 'signed-up';

interface OwnerProspectStatusBadgeProps {
  status: OwnerProspectStatus;
  prospectId: string;
  onStatusChange?: (prospectId: string, newStatus: OwnerProspectStatus) => void;
}

const statusConfig: Record<OwnerProspectStatus, { label: string; className: string }> = {
  prospect: {
    label: 'Prospect',
    className: 'bg-gray-500 text-white hover:bg-gray-600',
  },
  called: {
    label: 'Called',
    className: 'bg-orange-500 text-white hover:bg-orange-600',
  },
  emailed: {
    label: 'Emailed',
    className: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  'direct-mail': {
    label: 'Direct Mail',
    className: 'bg-purple-500 text-white hover:bg-purple-600',
  },
  'walked-in': {
    label: 'Walked In',
    className: 'bg-teal-500 text-white hover:bg-teal-600',
  },
  'zoom-meeting': {
    label: 'Zoom Meeting',
    className: 'bg-cyan-500 text-white hover:bg-cyan-600',
  },
  meeting: {
    label: 'Meeting',
    className: 'bg-indigo-500 text-white hover:bg-indigo-600',
  },
  'sent-order-form': {
    label: 'Sent Order Form',
    className: 'bg-yellow-500 text-white hover:bg-yellow-600',
  },
  'signed-up': {
    label: 'Signed Up',
    className: 'bg-green-600 text-white hover:bg-green-700',
  },
};

const allStatuses: OwnerProspectStatus[] = [
  'prospect',
  'called',
  'emailed',
  'direct-mail',
  'walked-in',
  'zoom-meeting',
  'meeting',
  'sent-order-form',
  'signed-up',
];

export function OwnerProspectStatusBadge({ status, prospectId, onStatusChange }: OwnerProspectStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[status] || statusConfig['prospect'];

  const handleStatusChange = (newStatus: OwnerProspectStatus) => {
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
        {allStatuses.map((statusOption) => {
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
