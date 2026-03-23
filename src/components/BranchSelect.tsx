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
import { useDashboardStore, mockBranches } from '@/stores/dashboardStore';
import { useMemo, useState, useEffect } from 'react';
import { fetchClientBranches } from '@/lib/dashboardApi';

export function BranchSelect() {
  const { selectedBranch, setSelectedBranch, movements, prospects } = useDashboardStore();
  const [open, setOpen] = useState(false);

  // Start with branches discovered from loaded movements/prospects (fast, client-side)
  const initialBranches = useMemo(() => {
    const unique = new Set<string>();
    movements.forEach((movement) => {
      if (movement.branch) unique.add(movement.branch);
    });
    prospects.forEach((prospect) => {
      if (prospect.branch) unique.add(prospect.branch);
    });
    const branchOptions = Array.from(unique)
      .sort((left, right) => left.localeCompare(right))
      .map((branch) => ({ value: branch, label: branch }));
    return [{ value: 'all', label: 'All Branches' }, ...branchOptions];
  }, [movements, prospects]);

  const [branches, setBranches] = useState<{ value: string; label: string }[]>(initialBranches);
  const agencyId = useDashboardStore(state => state.agencyId);

  useEffect(() => {
    if (initialBranches.length > 1) {
      setBranches(initialBranches);
    }
  }, [initialBranches]);

  // If movements don't contain branch names, try fetching branches directly from DB
  useEffect(() => {
    let mounted = true;
    const needsFetch = initialBranches.length <= 1; // only 'All Branches' present
    
    if (!needsFetch) {
      console.log('[BranchSelect] Using branches from movements:', initialBranches.length);
      return;
    }
    
    if (!agencyId) {
      console.warn('[BranchSelect] Cannot fetch branches: agencyId is not available');
      return;
    }

    console.log('[BranchSelect] Fetching branches from DB for agencyId:', agencyId);
    (async () => {
      try {
        const rows = await fetchClientBranches(agencyId);
        if (!mounted) return;
        
        if (rows && rows.length > 0) {
          console.log('[BranchSelect] Loaded', rows.length, 'branches from DB');
          setBranches([{ value: 'all', label: 'All Branches' }, ...rows.map(r => ({ value: r.name, label: r.name }))]);
        } else {
          // fallback to configured mockBranches
          console.warn('[BranchSelect] No branches found from DB, using mockBranches fallback');
          setBranches([{ value: 'all', label: 'All Branches' }, ...mockBranches.map(b => ({ value: b.name, label: b.name }))]);
        }
      } catch (e) {
        console.error('[BranchSelect] Error fetching client branches:', e);
        setBranches([{ value: 'all', label: 'All Branches' }, ...mockBranches.map(b => ({ value: b.name, label: b.name }))]);
      }
    })();

    return () => { mounted = false; };
  }, [agencyId, initialBranches.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-[200px] shrink-0 justify-between bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        >
          {branches.find((branch) => branch.value === selectedBranch)?.label ?? (branches.length > 1 ? 'Select branch' : 'No branches available')}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover text-popover-foreground">
        <Command>
          <CommandInput placeholder="Search branch..." className="text-foreground" />
          <CommandEmpty className="text-muted-foreground">No branch found.</CommandEmpty>
          <CommandGroup>
            {branches.map((branch) => (
              <CommandItem
                key={branch.value}
                value={branch.value}
                onSelect={() => {
                  setSelectedBranch(branch.value);
                  setOpen(false);
                }}
                className="text-foreground"
              >
                <CheckIcon
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedBranch === branch.value ? 'opacity-100' : 'opacity-0'
                  )}
                  strokeWidth={1.5}
                />
                {branch.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
