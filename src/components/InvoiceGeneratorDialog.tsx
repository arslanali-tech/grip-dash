import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchClientsForAgency, fetchStaffMembers, StaffMemberRow } from '@/lib/ownerApi';
import { notifyError } from '@/lib/notify';

interface InvoiceGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: { client: string; amount: string; description: string; dueDate: string; staffMember?: string; staffMemberName?: string }) => void;
  agencyId?: string | null;
  branchName?: string;
}

export function InvoiceGeneratorDialog({ open, onOpenChange, onGenerate, agencyId, branchName }: InvoiceGeneratorDialogProps) {
  const [staffMember, setStaffMember] = useState('');
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffMemberRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const normalizedBranchName = (branchName ?? '').trim().toLowerCase();
  const branchScopedStaff = normalizedBranchName
    ? staffList.filter((staff) => (staff.branch_name ?? '').trim().toLowerCase() === normalizedBranchName)
    : staffList;
  const visibleStaffList = branchScopedStaff.length > 0 ? branchScopedStaff : staffList;
  const isBranchFallback = !!normalizedBranchName && branchScopedStaff.length === 0 && staffList.length > 0;

  useEffect(() => {
    if (!open || !agencyId) {
      setClients([]);
      return;
    }
    setClientsLoading(true);
    fetchClientsForAgency(agencyId)
      .then((rows) => setClients(rows.map((c) => ({ id: c.id, name: c.name }))))
      .finally(() => setClientsLoading(false));
  }, [open, agencyId]);
  useEffect(() => {
    if (!open || !agencyId) {
      setStaffList([]);
      return;
    }
    setLoadingStaff(true);
    fetchStaffMembers(agencyId)
      .then((rows) => setStaffList(rows))
      .finally(() => setLoadingStaff(false));
  }, [open, agencyId]);

  const handleGenerate = () => {
    const staffObj = visibleStaffList.find((s) => s.id === staffMember) ?? staffList.find((s) => s.id === staffMember);
    if (client && amount && description && dueDate) {
      onGenerate({ client, amount, description, dueDate, staffMember: staffMember || undefined, staffMemberName: staffObj?.name });
      // Reset form
      setStaffMember('');
      setClient('');
      setAmount('');
      setDescription('');
      setDueDate('');
      onOpenChange(false);
    } else {
      notifyError('Please fill in all required fields.');
    }
  };

  const handleCancel = () => {
    setStaffMember('');
    setClient('');
    setAmount('');
    setDescription('');
    setDueDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Generate Invoice</DialogTitle>
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
            <Label htmlFor="client" className="text-foreground">
              Client
            </Label>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger id="client" className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {clientsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading clients…</div>
                ) : clients.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No clients found</div>
                ) : (
                  clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Amount (£)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g., 1500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Monthly subscription fee"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background text-foreground min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date" className="text-foreground">
              Due Date
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-background text-foreground"
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
            onClick={handleGenerate}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Generate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
