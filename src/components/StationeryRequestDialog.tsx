import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchStaffMembers, StaffMemberRow } from '@/lib/ownerApi';
import { notifyError } from '@/lib/notify';

interface StationeryRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { item: string; quantity: number; notes: string; staffMember?: string; staffMemberName?: string }) => void;
  agencyId?: string;
  branchName?: string;
  staffMembers?: Array<{ id: string; name: string; branch_name?: string | null }>;
}

const DEFAULT_STATIONERY_OPTIONS = [
  { value: 'pens', label: 'Pens' },
  { value: 'notebooks', label: 'Notebooks' },
  { value: 'envelopes', label: 'Envelopes' },
  { value: 'printer-paper', label: 'Printer Paper' },
  { value: 'business-cards', label: 'Business Cards' },
  { value: '__other__', label: 'Other (specify below)' },
];

export function StationeryRequestDialog({ open, onOpenChange, onSave, agencyId, branchName, staffMembers }: StationeryRequestDialogProps) {
  const [staffMember, setStaffMember] = useState('');
  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [staffList, setStaffList] = useState<StaffMemberRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const isOther = item === '__other__';
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
    const validItem = isOther ? customItem.trim() : item;
    const staffObj = visibleStaffList.find((s) => s.id === staffMember) ?? staffList.find((s) => s.id === staffMember);
    if (validItem && parseInt(quantity) > 0) {
      onSave({
        item: validItem,
        quantity: parseInt(quantity),
        notes,
        staffMember: staffMember || undefined,
        staffMemberName: staffObj?.name,
      });
      setStaffMember('');
      setItem('');
      setCustomItem('');
      setQuantity('1');
      setNotes('');
      onOpenChange(false);
    } else {
      notifyError(isOther ? 'Please enter the item name and a valid quantity.' : 'Please select an item and specify a valid quantity.');
    }
  };

  const handleCancel = () => {
    setStaffMember('');
    setItem('');
    setCustomItem('');
    setQuantity('1');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Stationery Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="staff-member" className="text-foreground">
              Staff Member (optional)
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
                    {visibleStaffList.map((staff) => (
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
            <Label htmlFor="stationery-item" className="text-foreground">
              Item
            </Label>
            <Select value={item} onValueChange={setItem}>
              <SelectTrigger id="stationery-item" className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select stationery item" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {DEFAULT_STATIONERY_OPTIONS.map(sItem => (
                  <SelectItem key={sItem.value} value={sItem.value}>{sItem.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isOther && (
              <Input
                placeholder="Enter item name"
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                className="bg-background text-foreground border-border mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-foreground">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-background text-foreground"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes for the request..."
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
