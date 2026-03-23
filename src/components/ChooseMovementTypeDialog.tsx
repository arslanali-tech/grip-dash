import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MovementStatus } from '@/stores/dashboardStore';

interface ChooseMovementTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (status: MovementStatus) => void;
}

// Re-using statusConfig for consistent colors
const statusConfig: Record<MovementStatus, { label: string; className: string }> = {
  offer: { label: 'Offer', className: 'bg-[#4169E1] text-white' },
  'let-offer': { label: 'Let Offer', className: 'bg-[#9370DB] text-white' },
  'on-books': { label: 'On Books', className: 'bg-[#FFB800] text-white' },
  abort: { label: 'Abort', className: 'bg-[#4169E1] text-white' },
  'aml-referral': { label: 'AML Referral', className: 'bg-muted text-muted-foreground' },
  'back-on': { label: 'Back On', className: 'bg-muted text-muted-foreground' },
  completed: { label: 'Completed', className: 'bg-[#9370DB] text-white' },
  exchanged: { label: 'Exchanged', className: 'bg-[#2E8B57] text-white' },
  'legal-referral': { label: 'Legal Referral', className: 'bg-muted text-muted-foreground' },
  'legal-signup': { label: 'Legal Signup', className: 'bg-muted text-muted-foreground' },
  'mortgage-referral': { label: 'Mortgage Referral', className: 'bg-muted text-muted-foreground' },
  'mortgage-signup': { label: 'Mortgage Signup', className: 'bg-muted text-muted-foreground' },
  'on-books-status': { label: 'On Books', className: 'bg-[#FFB800] text-white' },
  'price-change': { label: 'Price Change (S)', className: 'bg-muted text-muted-foreground' },
  sale: { label: 'Sale', className: 'bg-[#FF6347] text-white' },
  valuation: { label: 'Valuation', className: 'bg-[#FF8C69] text-white' },
  'valuation-referral': { label: 'Valuation Referral', className: 'bg-muted text-muted-foreground' },
  'withdrawn-sales': { label: 'Withdrawn Sales', className: 'bg-muted text-muted-foreground' },
  let: { label: 'Let', className: 'bg-[#00CED1] text-white' },
  'back-on-let': { label: 'Back On', className: 'bg-[#4169E1] text-white' },
  withdrawn: { label: 'Withdrawn', className: 'bg-destructive text-destructive-foreground' },
};

const selectableStatuses: MovementStatus[] = [
  'on-books',
  'valuation',
  'mortgage-referral', // This will now open the unified B2B dialog
];

export function ChooseMovementTypeDialog({ open, onOpenChange, onSelect }: ChooseMovementTypeDialogProps) {
  const handleSelect = (status: MovementStatus) => {
    onSelect(status);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Choose Movement Type</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-3 py-4">
          <Button
            onClick={() => {
              handleSelect('on-books');
            }}
            className="flex-1 h-12 text-sm font-semibold bg-[#FFB800] text-white hover:bg-[#FFB800]/80"
          >
            On Books
          </Button>
          <Button
            onClick={() => {
              handleSelect('valuation');
            }}
            className="flex-1 h-12 text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700"
          >
            Valuation
          </Button>
          <Button
            onClick={() => {
              // Close dialog first
              onOpenChange(false);
              
              // Wait for dialog to fully close before opening new one
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    const event = new CustomEvent('open-b2b-referral');
                    window.dispatchEvent(event);
                  }, 250);
                });
              });
            }}
            className="flex-1 h-12 text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700"
          >
            B2B Referral
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
