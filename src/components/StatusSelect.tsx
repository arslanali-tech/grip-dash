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
import { useDashboardStore, MovementStatus } from '@/stores/dashboardStore';
import { useState } from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
  all: {
    label: 'All Statuses',
    className: '',
  },
  offer: {
    label: 'Offer',
    className: 'bg-[#4169E1] text-white',
  },
  'let-offer': {
    label: 'Let Offer',
    className: 'bg-[#9370DB] text-white',
  },
  'on-books': {
    label: 'On Books',
    className: 'bg-[#FFB800] text-white',
  },
  abort: {
    label: 'Abort',
    className: 'bg-[#4169E1] text-white',
  },
  'aml-referral': {
    label: 'AML Referral',
    className: 'bg-muted text-muted-foreground',
  },
  'back-on': {
    label: 'Back On',
    className: 'bg-muted text-muted-foreground',
  },
  completed: {
    label: 'Completed',
    className: 'bg-[#9370DB] text-white',
  },
  exchanged: {
    label: 'Exchanged',
    className: 'bg-[#2E8B57] text-white',
  },
  'legal-referral': {
    label: 'Legal Referral',
    className: 'bg-muted text-muted-foreground',
  },
  'legal-signup': {
    label: 'Legal Signup',
    className: 'bg-muted text-muted-foreground',
  },
  'mortgage-referral': {
    label: 'Mortgage Referral',
    className: 'bg-muted text-muted-foreground',
  },
  'mortgage-signup': {
    label: 'Mortgage Signup',
    className: 'bg-muted text-muted-foreground',
  },
  'on-books-status': {
    label: 'On Books',
    className: 'bg-[#FFB800] text-white',
  },
  'price-change': {
    label: 'Price Change (S)',
    className: 'bg-muted text-muted-foreground',
  },
  sale: {
    label: 'Sale',
    className: 'bg-[#FF6347] text-white',
  },
  valuation: {
    label: 'Valuation',
    className: 'bg-pink-600 text-white',
  },
  'valuation-referral': {
    label: 'Valuation Referral',
    className: 'bg-muted text-muted-foreground',
  },
  'withdrawn-sales': {
    label: 'Withdrawn Sales',
    className: 'bg-muted text-muted-foreground',
  },
  let: {
    label: 'Let',
    className: 'bg-[#00CED1] text-white',
  },
  'back-on-let': {
    label: 'Back On',
    className: 'bg-[#4169E1] text-white',
  },
  withdrawn: {
    label: 'Withdrawn',
    className: 'bg-destructive text-destructive-foreground',
  },
};

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'offer', label: 'Offer' },
  { value: 'let-offer', label: 'Let Offer' },
  { value: 'on-books', label: 'On Books' },
  { value: 'abort', label: 'Abort' },
  { value: 'aml-referral', label: 'AML Referral' },
  { value: 'back-on', label: 'Back On' },
  { value: 'completed', label: 'Completed' },
  { value: 'exchanged', label: 'Exchanged' },
  { value: 'legal-referral', label: 'Legal Referral' },
  { value: 'legal-signup', label: 'Legal Signup' },
  { value: 'mortgage-referral', label: 'Mortgage Referral' },
  { value: 'mortgage-signup', label: 'Mortgage Signup' },
  { value: 'price-change', label: 'Price Change (S)' },
  { value: 'sale', label: 'Sale' },
  { value: 'valuation', label: 'Valuation' },
  { value: 'valuation-referral', label: 'Valuation Referral' },
  { value: 'withdrawn-sales', label: 'Withdrawn Sales' },
  { value: 'let', label: 'Let' },
  { value: 'back-on-let', label: 'Back On (Let)' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function StatusSelect() {
  const { selectedStatus, setSelectedStatus } = useDashboardStore();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-[180px] shrink-0 justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        >
          {statusOptions.find((status) => status.value === selectedStatus)?.label}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 bg-popover text-popover-foreground">
        <Command>
          <CommandInput placeholder="Search status..." className="text-foreground" />
          <CommandEmpty className="text-muted-foreground">No status found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {statusOptions.map((status) => {
              const config = statusConfig[status.value];
              return (
                <CommandItem
                  key={status.value}
                  value={status.value}
                  onSelect={(currentValue) => {
                    setSelectedStatus(currentValue);
                    setOpen(false);
                  }}
                  className="text-foreground"
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedStatus === status.value ? 'opacity-100' : 'opacity-0'
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
