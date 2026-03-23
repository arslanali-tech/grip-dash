import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDashboardStore } from '@/stores/dashboardStore';

interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    isSplitSale: string;
    agent: string;
    agentIds: string[];
    agreedPrice: string;
    buyerSeller: string;
    notes: string;
  }) => void;
  movementId: string;
}

const splitSaleOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function SaleDialog({ open, onOpenChange, onSave, movementId }: SaleDialogProps) {
  const { staffMembers } = useDashboardStore();
  const [isSplitSale, setIsSplitSale] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [buyerSeller, setBuyerSeller] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic options from store
  const agentOptions = staffMembers.map(s => ({ value: s.id, label: s.name }));
  const selectedAgentNames = selectedAgentIds
    .map((agentId) => agentOptions.find((option) => option.value === agentId)?.label)
    .filter(Boolean) as string[];

  // Reset form fields when dialog opens
  useEffect(() => {
    if (open) {
      setIsSplitSale('');
      setSelectedAgentIds(staffMembers.length > 0 ? [staffMembers[0].id] : []);
      setAgreedPrice('');
      setBuyerSeller('');
      setNotes('');
    }
  }, [open, movementId, staffMembers]);

  useEffect(() => {
    if (isSplitSale !== 'no') return;
    if (selectedAgentIds.length <= 1) return;
    setSelectedAgentIds(selectedAgentIds.slice(0, 1));
  }, [isSplitSale, selectedAgentIds]);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      }
      return [...prev, agentId];
    });
  };

  const handleSave = () => {
    if (!isSplitSale || selectedAgentIds.length === 0 || !agreedPrice || !buyerSeller) {
      alert('Please fill in all required fields.');
      return;
    }
    const saleDetails = {
      isSplitSale,
      agent: selectedAgentNames.join(', '),
      agentIds: selectedAgentIds,
      agreedPrice,
      buyerSeller,
      notes,
    };
    console.log('SaleDialog: Saving data:', saleDetails);
    onSave(saleDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[500px] max-h-[95vh] overflow-y-auto bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Sale</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="is-split-sale" className="text-foreground">
              Was this sale a split sale?
            </Label>
            <Select value={isSplitSale} onValueChange={setIsSplitSale}>
              <SelectTrigger id="is-split-sale" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose an option..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {splitSaleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-agent" className="text-foreground">
              Select selling team member
            </Label>
            {isSplitSale === 'yes' ? (
              <div className="space-y-2 rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">
                  Split sale is enabled. Select one or more team members.
                </p>
                <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                  {agentOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <Checkbox
                        checked={selectedAgentIds.includes(option.value)}
                        onCheckedChange={() => toggleAgent(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <Select
                value={selectedAgentIds[0] ?? ''}
                onValueChange={(value) => setSelectedAgentIds(value ? [value] : [])}
              >
                <SelectTrigger id="confirm-agent" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Choose a team member..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {agentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agreed-price" className="text-foreground">
              Agreed Price
            </Label>
            <Input
              id="agreed-price"
              type="text"
              placeholder="GBP 1000.00"
              value={agreedPrice}
              onChange={(e) => setAgreedPrice(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyer-seller" className="text-foreground">
              Buyer/Seller Name
            </Label>
            <Input
              id="buyer-seller"
              type="text"
              placeholder="Enter buyer or seller name"
              value={buyerSeller}
              onChange={(e) => setBuyerSeller(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Type here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background text-foreground min-h-[100px]"
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
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

