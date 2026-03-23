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
import { useDashboardStore } from '@/stores/dashboardStore';
import { useState } from 'react';

const movementTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'sale', label: 'Sales' },
  { value: 'letting', label: 'Lettings' },
];

export function MovementTypeSelect() {
  const { selectedMovementType, setSelectedMovementType } = useDashboardStore();
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
          {movementTypes.find((type) => type.value === selectedMovementType)?.label}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0 bg-popover text-popover-foreground">
        <Command>
          <CommandInput placeholder="Search type..." className="text-foreground" />
          <CommandEmpty className="text-muted-foreground">No type found.</CommandEmpty>
          <CommandGroup>
            {movementTypes.map((type) => (
              <CommandItem
                key={type.value}
                value={type.value}
                onSelect={(currentValue) => {
                  setSelectedMovementType(currentValue);
                  setOpen(false);
                }}
                className="text-foreground"
              >
                <CheckIcon
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedMovementType === type.value ? 'opacity-100' : 'opacity-0'
                  )}
                  strokeWidth={1.5}
                />
                {type.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
