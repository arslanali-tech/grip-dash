import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { viewingArrangementOptions, type ViewingArrangement } from '@/lib/viewingArrangements';

export interface OnBooksDialogMovement {
  address?: string;
  property?: string;
  agent?: string;
  price?: number | null;
  feeAmount?: number | null;
  feePercentage?: number | null;
  board?: boolean;
  viewingArrangement?: ViewingArrangement;
  viewingNotes?: string;
  motivatedSeller?: string;
  notes?: string;
}

export interface OnBooksDialogSaveData {
  address: string;
  property: string;
  agent: string;
  price: string;
  feeAmount: string;
  feePercentage: string;
  board: 'yes' | 'no';
  viewingArrangement: ViewingArrangement | '';
  viewingNotes: string;
  motivatedSeller: '' | 'red' | 'yellow' | 'green';
  notes: string;
}

interface OnBooksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementId: string;
  movement?: OnBooksDialogMovement | null;
  onSave: (data: OnBooksDialogSaveData) => void;
}

const sanitizeNumericInput = (value: string): string => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...decimals] = cleaned.split('.');
  if (decimals.length === 0) return whole;
  return `${whole}.${decimals.join('')}`;
};

const parseNumericInput = (value: string): number | undefined => {
  const normalized = sanitizeNumericInput(value).trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatCalculatedNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
};

const calculateFeeAmount = (price: number, feePercentage: number): number =>
  (price * feePercentage) / 100;

const calculateFeePercentage = (price: number, feeAmount: number): number =>
  (feeAmount / price) * 100;

export function OnBooksDialog({ open, onOpenChange, movementId, movement, onSave }: OnBooksDialogProps) {
  const [formData, setFormData] = useState<OnBooksDialogSaveData>({
    address: '',
    property: '',
    agent: '',
    price: '',
    feeAmount: '',
    feePercentage: '',
    board: 'no',
    viewingArrangement: '',
    viewingNotes: '',
    motivatedSeller: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    const price = movement?.price !== null && movement?.price !== undefined ? String(movement.price) : '';
    let feeAmount =
      movement?.feeAmount !== null && movement?.feeAmount !== undefined ? String(movement.feeAmount) : '';
    let feePercentage =
      movement?.feePercentage !== null && movement?.feePercentage !== undefined
        ? String(movement.feePercentage)
        : '';

    const parsedPrice = parseNumericInput(price);
    const parsedFeeAmount = parseNumericInput(feeAmount);
    const parsedFeePercentage = parseNumericInput(feePercentage);

    if (parsedPrice !== undefined && parsedPrice > 0) {
      const hasFeeAmount = feeAmount.trim().length > 0;
      const hasFeePercentage = feePercentage.trim().length > 0;
      if (!hasFeeAmount && hasFeePercentage && parsedFeePercentage !== undefined) {
        feeAmount = formatCalculatedNumber(calculateFeeAmount(parsedPrice, parsedFeePercentage));
      } else if (!hasFeePercentage && hasFeeAmount && parsedFeeAmount !== undefined) {
        feePercentage = formatCalculatedNumber(calculateFeePercentage(parsedPrice, parsedFeeAmount));
      }
    }

    setFormData({
      address: movement?.address ?? '',
      property: movement?.property ?? '',
      agent: movement?.agent ?? '',
      price,
      feeAmount,
      feePercentage,
      board: movement?.board ? 'yes' : 'no',
      viewingArrangement: movement?.viewingArrangement ?? '',
      viewingNotes: movement?.viewingNotes ?? '',
      motivatedSeller:
        movement?.motivatedSeller === 'red' ||
        movement?.motivatedSeller === 'yellow' ||
        movement?.motivatedSeller === 'green'
          ? movement.motivatedSeller
          : '',
      notes: movement?.notes ?? '',
    });
  }, [open, movementId, movement]);

  const handlePriceChange = (rawValue: string) => {
    const nextPrice = sanitizeNumericInput(rawValue);
    setFormData((prev) => {
      const next: OnBooksDialogSaveData = { ...prev, price: nextPrice };
      const parsedPrice = parseNumericInput(nextPrice);
      if (parsedPrice === undefined || parsedPrice <= 0) return next;

      const parsedFeePercentage = parseNumericInput(prev.feePercentage);
      const parsedFeeAmount = parseNumericInput(prev.feeAmount);
      if (prev.feePercentage.trim().length > 0 && parsedFeePercentage !== undefined) {
        next.feeAmount = formatCalculatedNumber(calculateFeeAmount(parsedPrice, parsedFeePercentage));
      } else if (prev.feeAmount.trim().length > 0 && parsedFeeAmount !== undefined) {
        next.feePercentage = formatCalculatedNumber(calculateFeePercentage(parsedPrice, parsedFeeAmount));
      }
      return next;
    });
  };

  const handleFeeAmountChange = (rawValue: string) => {
    const nextFeeAmount = sanitizeNumericInput(rawValue);
    setFormData((prev) => {
      const next: OnBooksDialogSaveData = { ...prev, feeAmount: nextFeeAmount };
      const parsedPrice = parseNumericInput(prev.price);
      const parsedFeeAmount = parseNumericInput(nextFeeAmount);
      if (
        parsedPrice !== undefined &&
        parsedPrice > 0 &&
        nextFeeAmount.trim().length > 0 &&
        parsedFeeAmount !== undefined
      ) {
        next.feePercentage = formatCalculatedNumber(calculateFeePercentage(parsedPrice, parsedFeeAmount));
      }
      return next;
    });
  };

  const handleFeePercentageChange = (rawValue: string) => {
    const nextFeePercentage = sanitizeNumericInput(rawValue);
    setFormData((prev) => {
      const next: OnBooksDialogSaveData = { ...prev, feePercentage: nextFeePercentage };
      const parsedPrice = parseNumericInput(prev.price);
      const parsedFeePercentage = parseNumericInput(nextFeePercentage);
      if (
        parsedPrice !== undefined &&
        parsedPrice > 0 &&
        nextFeePercentage.trim().length > 0 &&
        parsedFeePercentage !== undefined
      ) {
        next.feeAmount = formatCalculatedNumber(calculateFeeAmount(parsedPrice, parsedFeePercentage));
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!formData.address.trim()) {
      alert('Address is required.');
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[700px] max-h-[90vh] overflow-y-auto bg-card p-4 text-card-foreground sm:p-6">
        <DialogHeader>
          <DialogTitle>Move to On Books</DialogTitle>
          <DialogDescription>
            Existing information is prefilled. Add or edit any extra attributes before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Current status</p>
                <p className="font-medium text-foreground">Valuation</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium text-foreground truncate">{movement?.address || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="font-medium text-foreground truncate">{movement?.property || '-'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="on-books-address">Address</Label>
              <Input
                id="on-books-address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Property address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="on-books-property">Description</Label>
              <Input
                id="on-books-property"
                value={formData.property}
                onChange={(e) => setFormData((prev) => ({ ...prev, property: e.target.value }))}
                placeholder="e.g. 2 bed flat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="on-books-agent">Team Member</Label>
              <Input
                id="on-books-agent"
                value={formData.agent}
                onChange={(e) => setFormData((prev) => ({ ...prev, agent: e.target.value }))}
                placeholder="Negotiator name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="on-books-price">Price</Label>
              <Input
                id="on-books-price"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="e.g. 200000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="on-books-fee-amount">Fee Amount</Label>
              <Input
                id="on-books-fee-amount"
                value={formData.feeAmount}
                onChange={(e) => handleFeeAmountChange(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="on-books-fee-percentage">Fee Percentage</Label>
              <Input
                id="on-books-fee-percentage"
                value={formData.feePercentage}
                onChange={(e) => handleFeePercentageChange(e.target.value)}
                placeholder="e.g. 1.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Viewing Arrangements</Label>
              <Select
                value={formData.viewingArrangement}
                onValueChange={(value: ViewingArrangement) =>
                  setFormData((prev) => ({ ...prev, viewingArrangement: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select arrangement" />
                </SelectTrigger>
                <SelectContent>
                  {viewingArrangementOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="on-books-viewing-notes">Viewing Notes</Label>
              <Input
                id="on-books-viewing-notes"
                value={formData.viewingNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, viewingNotes: e.target.value }))}
                placeholder="Add key viewing instructions"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivated Seller</Label>
              <Select
                value={formData.motivatedSeller}
                onValueChange={(value: '' | 'red' | 'yellow' | 'green') =>
                  setFormData((prev) => ({ ...prev, motivatedSeller: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Red - Low</SelectItem>
                  <SelectItem value="yellow">Yellow - Medium</SelectItem>
                  <SelectItem value="green">Green - High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Board</Label>
              <Select
                value={formData.board}
                onValueChange={(value: 'yes' | 'no') => setFormData((prev) => ({ ...prev, board: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="on-books-notes">Notes</Label>
            <Textarea
              id="on-books-notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes for this status update"
              className="min-h-[110px]"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save and Move to On Books
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
