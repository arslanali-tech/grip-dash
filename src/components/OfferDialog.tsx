import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusIcon, XIcon } from 'lucide-react';
import { addMovementOffer } from '@/lib/dashboardApi';

interface OfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementType?: 'sale' | 'letting';
  onSave?: (data: {
    amount: number;
    buyer: string;
    status: string;
    submitted_date: string;
    notes?: string;
  }) => Promise<boolean | void> | boolean | void;
  movementId: string;
}

const offerStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function OfferDialog({ open, onOpenChange, onSave, movementId, movementType }: OfferDialogProps) {
  const [amount, setAmount] = useState('');
  const [buyerNames, setBuyerNames] = useState<string[]>(['']);
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isLettingsMovement = movementType === 'letting';

  // Reset form fields when dialog opens for a new movementId
  useEffect(() => {
    if (open) {
      setAmount('');
      setBuyerNames(['']);
      setStatus('pending');
      setNotes('');
    }
  }, [open, movementId]);

  const updateBuyer = (index: number, value: string) => {
    setBuyerNames((prev) => prev.map((entry, idx) => (idx === index ? value : entry)));
  };

  const addBuyerField = () => {
    setBuyerNames((prev) => [...prev, '']);
  };

  const removeBuyerField = (index: number) => {
    setBuyerNames((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSave = async () => {
    const normalizedNames = buyerNames.map((name) => name.trim()).filter(Boolean);

    if (!amount || normalizedNames.length === 0) {
      alert(
        isLettingsMovement
          ? 'Please enter offer amount and tenant name.'
          : 'Please enter offer amount and buyer name.'
      );
      return;
    }

    if (!movementId) {
      alert('Movement ID is required to save an offer.');
      return;
    }

    setIsSaving(true);
    try {
      const amountValue = parseFloat(amount.replace(/[^0-9.]/g, ''));
      const buyerValue = normalizedNames.join(', ');

      const offerData = {
        amount: amountValue || 0,
        buyer: buyerValue,
        status: status,
        submitted_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      };

      let saved = false;

      if (onSave) {
        const result = await onSave({
          amount: offerData.amount,
          buyer: offerData.buyer,
          status: offerData.status,
          submitted_date: new Date().toISOString(),
          notes: offerData.notes ?? undefined,
        });
        saved = result !== false;
      } else {
        const created = await addMovementOffer(movementId, offerData);
        saved = !!created;
      }

      if (!saved) {
        alert('Failed to save offer. Please try again.');
        return;
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving offer:', error);
      alert('An error occurred while saving the offer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Offer</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="offer-amount" className="text-foreground">
              Offer Amount
            </Label>
            <Input
              id="offer-amount"
              type="text"
              placeholder="GBP 1000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyer-seller" className="text-foreground">
              {isLettingsMovement ? 'Tenant Name' : 'Buyer Name'} <span className="text-destructive">*</span>
            </Label>
            {isLettingsMovement ? (
              <Input
                id="buyer-seller"
                type="text"
                placeholder="John Smith"
                value={buyerNames[0] ?? ''}
                onChange={(e) => updateBuyer(0, e.target.value)}
                className="bg-background text-foreground"
              />
            ) : (
              <div className="space-y-2">
                {buyerNames.map((buyerName, index) => (
                  <div key={`buyer-${index}`} className="flex items-center gap-2">
                    <Input
                      id={index === 0 ? 'buyer-seller' : `buyer-seller-${index}`}
                      type="text"
                      placeholder={index === 0 ? 'John Smith' : `Buyer ${index + 1}`}
                      value={buyerName}
                      onChange={(e) => updateBuyer(index, e.target.value)}
                      className="bg-background text-foreground"
                    />
                    {buyerNames.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => removeBuyerField(index)}
                        aria-label={`Remove buyer ${index + 1}`}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={addBuyerField}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add buyer
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-status" className="text-foreground">
              Offer Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="offer-status" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {offerStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? 'Saving...' : 'Save Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
