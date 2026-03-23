import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { fetchStaffMembers, StaffMemberRow } from '@/lib/ownerApi';
import { notifyError } from '@/lib/notify';

interface HolidayRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { staffMember: string; staffMemberName?: string; dateRange: DateRange; notes: string }) => void;
  agencyId?: string;
  branchName?: string;
  staffMembers?: Array<{ id: string; name: string; branch_name?: string | null }>;
}
export function HolidayRequestDialog({ open, onOpenChange, onSave, agencyId, branchName, staffMembers }: HolidayRequestDialogProps) {
  const [staffMember, setStaffMember] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffMemberRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const normalizedBranchName = (branchName ?? '').trim().toLowerCase();
  const branchScopedStaff = normalizedBranchName
    ? staffList.filter((staff) => (staff.branch_name ?? '').trim().toLowerCase() === normalizedBranchName)
    : staffList;
  const visibleStaffList = branchScopedStaff.length > 0 ? branchScopedStaff : staffList;
  const isBranchFallback = !!normalizedBranchName && branchScopedStaff.length === 0 && staffList.length > 0;

  useEffect(() => {
    const loadStaff = async () => {
      if (!open) return;

      if (staffMembers && staffMembers.length > 0) {
        setStaffList(staffMembers as StaffMemberRow[]);
        return;
      }

      if (!agencyId) return;
      setLoadingStaff(true);
      const staff = await fetchStaffMembers(agencyId);
      setStaffList(staff);
      setLoadingStaff(false);
    };
    void loadStaff();
  }, [open, agencyId, staffMembers]);

  const handleSave = () => {
    if (staffMember && dateRange?.from) {
      const staffObj = visibleStaffList.find(s => s.id === staffMember) ?? staffList.find(s => s.id === staffMember);
      onSave({ staffMember, staffMemberName: staffObj?.name, dateRange, notes });
      // Reset form
      setStaffMember('');
      setDateRange(undefined);
      setNotes('');
      onOpenChange(false);
    } else {
      notifyError('Please select a staff member and a date range.');
    }
  };

  const handleCancel = () => {
    setStaffMember('');
    setDateRange(undefined);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add Holiday Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="staff-member" className="text-foreground">
              Staff Member
            </Label>
            <Select value={staffMember} onValueChange={setStaffMember}>
              <SelectTrigger id="staff-member" className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {loadingStaff ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading staff...</div>
                ) : visibleStaffList.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No staff members found</div>
                ) : (
                  <>
                    {isBranchFallback && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">Showing all staff (no exact branch match).</div>
                    )}
                    {visibleStaffList.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}{staff.branch_name ? ` — ${staff.branch_name}` : ''}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-range" className="text-foreground">
              Date Range
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground',
                    !dateRange?.from && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover text-popover-foreground" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from ?? new Date()}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes for the holiday request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background text-foreground min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
