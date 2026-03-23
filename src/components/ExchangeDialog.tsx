import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface ExchangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    exchangeDate: string;
    completionDate: string;
    invoiceLink: string;
    boardCollectionLink: string;
    notes: string;
  }) => void;
  movementId: string;
}

export function ExchangeDialog({ open, onOpenChange, onSave, movementId }: ExchangeDialogProps) {
  const [exchangeDate, setExchangeDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [invoiceLink, setInvoiceLink] = useState('');
  const [boardCollectionLink, setBoardCollectionLink] = useState('');
  const [notes, setNotes] = useState('');

  // Set default dates to today when dialog opens
  useEffect(() => {
    if (open) {
      const today = format(new Date(), 'yyyy-MM-dd');
      setExchangeDate(today);
      setCompletionDate(today);
      setInvoiceLink('');
      setBoardCollectionLink('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleSave = () => {
    if (!exchangeDate || !completionDate) {
      alert('Please enter both Exchange Date and Completion Date.');
      return;
    }
    const exchangeDetails = {
      exchangeDate,
      completionDate,
      invoiceLink,
      boardCollectionLink,
      notes,
    };
    console.log('ExchangeDialog: Saving data:', exchangeDetails);
    onSave(exchangeDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Exchange</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="exchange-date" className="text-foreground">
              Exchange Date
            </Label>
            <Input
              id="exchange-date"
              type="date"
              value={exchangeDate}
              onChange={(e) => setExchangeDate(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completion-date" className="text-foreground">
              Completion Date
            </Label>
            <Input
              id="completion-date"
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-link" className="text-foreground">
              Click to raise invoice
            </Label>
            <Input
              id="invoice-link"
              type="url"
              placeholder="https://login.xero.com/identity/user/login"
              value={invoiceLink}
              onChange={(e) => setInvoiceLink(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-link" className="text-foreground">
              Click to order board collection
            </Label>
            <Input
              id="board-link"
              type="url"
              placeholder="https://signmaster.agencyexpress.net/login.cfm?destination=/index.cfm"
              value={boardCollectionLink}
              onChange={(e) => setBoardCollectionLink(e.target.value)}
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
