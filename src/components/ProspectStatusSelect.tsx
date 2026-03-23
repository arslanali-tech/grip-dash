import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDashboardStore, ProspectingStatus } from '@/stores/dashboardStore';
import { useState } from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
  all: {
    label: 'All Stages',
    className: '',
  },
  canvassed: {
    label: 'Canvassed',
    className: 'bg-indigo-600 text-white',
  },
  'not-available': {
    label: 'Not Available',
    className: 'bg-gray-500 text-white',
  },
  opportunities: {
    label: 'Opportunities',
    className: 'bg-amber-500 text-white',
  },
  'potential-seller': {
    label: 'Potential Seller',
    className: 'bg-fuchsia-600 text-white',
  },
  'sold-oa': {
    label: 'Sold OA',
    className: 'bg-rose-600 text-white',
  },
  valuation: {
    label: 'Valuation',
    className: 'bg-emerald-600 text-white',
  },
};

const prospectingStatuses: { value: string; label: string }[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'canvassed', label: 'Canvassed' },
  { value: 'not-available', label: 'Not Available' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'potential-seller', label: 'Potential Seller' },
  { value: 'sold-oa', label: 'Sold OA' },
  { value: 'valuation', label: 'Valuation' },
];

export function ProspectStatusSelect() {
  const { selectedProspectingStatus, setSelectedProspectingStatus } = useDashboardStore();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        >
          {prospectingStatuses.find((status) => status.value === selectedProspectingStatus)?.label}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 bg-popover text-popover-foreground">
        <Command>
          <CommandInput placeholder="Search stage..." className="text-foreground" />
          <CommandEmpty className="text-muted-foreground">No stage found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {prospectingStatuses.map((status) => {
              const config = statusConfig[status.value];
              return (
                <CommandItem
                  key={status.value}
                  value={status.value}
                  onSelect={(currentValue) => {
                    setSelectedProspectingStatus(currentValue);
                    setOpen(false);
                  }}
                  className="text-foreground whitespace-nowrap"
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedProspectingStatus === status.value ? 'opacity-100' : 'opacity-0'
                    )}
                    strokeWidth={1.5}
                  />
                  {status.value !== 'all' && (
                    <span
                      className={cn(
                        'mr-2 inline-block h-2 w-2 rounded-full',
                        config.className
                      )}
                    />
                  )}
                  {status.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
