import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PriceChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { newPrice: string; notes: string }) => void;
  movementId: string;
}

export function PriceChangeDialog({ open, onOpenChange, onSave, movementId }: PriceChangeDialogProps) {
  const [newPrice, setNewPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form fields when dialog opens for a new movementId
  useEffect(() => {
    if (open) {
      setNewPrice('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleSave = () => {
    if (!newPrice) {
      alert('Please enter a new price.');
      return;
    }
    const priceChangeDetails = { newPrice, notes };
    console.log('PriceChangeDialog: Saving data:', priceChangeDetails);
    onSave(priceChangeDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Sale Price Change</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-price" className="text-foreground">
              New Price
            </Label>
            <Input
              id="new-price"
              type="text"
              placeholder="£100,000"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
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
