import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AbortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { nextStep: string; notes: string }) => void;
  movementId: string;
}

const nextStepOptions = [
  { value: 're-list', label: 'Re-list' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 're-value', label: 'Re-value' },
  { value: 'other', label: 'Other' },
];

export function AbortDialog({ open, onOpenChange, onSave, movementId }: AbortDialogProps) {
  const [nextStep, setNextStep] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form fields when dialog opens for a new movementId
  useEffect(() => {
    if (open) {
      setNextStep('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleSave = () => {
    if (!nextStep) {
      alert('Please select a next step.');
      return;
    }
    const abortDetails = { nextStep, notes };
    console.log('AbortDialog: Saving data:', abortDetails);
    onSave(abortDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Abort</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="next-step" className="text-foreground">
              Next Step
            </Label>
            <Select value={nextStep} onValueChange={setNextStep}>
              <SelectTrigger id="next-step" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose an option..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {nextStepOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
