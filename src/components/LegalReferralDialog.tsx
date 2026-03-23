import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LegalReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { client: string; vendor: string; notes: string }) => void;
  movementId: string;
}

export function LegalReferralDialog({ open, onOpenChange, onSave, movementId }: LegalReferralDialogProps) {
  const [client, setClient] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form fields when dialog opens for a new movementId
  useEffect(() => {
    if (open) {
      setClient('');
      setVendor('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleSave = () => {
    if (!client || !vendor) {
      alert('Please select a client and a vendor.');
      return;
    }
    const legalReferralDetails = { client, vendor, notes };
    console.log('LegalReferralDialog: Saving data:', legalReferralDetails);
    onSave(legalReferralDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Legal Referral</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="client" className="text-foreground">
              Client
            </Label>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger id="client" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose some options..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="client1">Client 1</SelectItem>
                <SelectItem value="client2">Client 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor" className="text-foreground">
              Vendor
            </Label>
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger id="vendor" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose some options..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="vendor1">Vendor 1</SelectItem>
                <SelectItem value="vendor2">Vendor 2</SelectItem>
              </SelectContent>
            </Select>
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
