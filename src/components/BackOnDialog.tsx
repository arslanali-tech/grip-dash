import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BackOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { price: string; notes: string }) => void;
  movementId: string;
}

export function BackOnDialog({ open, onOpenChange, onSave, movementId }: BackOnDialogProps) {
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form fields when dialog opens for a new movementId
  useEffect(() => {
    if (open) {
      setPrice('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleSave = () => {
    if (!price) {
      alert('Please enter a price.');
      return;
    }
    const backOnDetails = { price, notes };
    console.log('BackOnDialog: Saving data:', backOnDetails);
    onSave(backOnDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Back On</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="price" className="text-foreground">
              Price
            </Label>
            <Input
              id="price"
              type="text"
              placeholder="£100,000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
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
