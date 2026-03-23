import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createMovement } from '@/lib/dashboardApi';
import { CalendarIcon } from 'lucide-react';

interface ValuationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (data: any) => void;
  agencyId?: string;
  branchId?: string;
}

const valuationTypeOptions = [
  { value: 'sale', label: 'Sale Valuation' },
  { value: 'letting', label: 'Letting Valuation' },
  { value: 'both', label: 'Sale & Letting' },
];

const sourceOptions = [
  { value: 'referral', label: 'Referral' },
  { value: 'online', label: 'Online Enquiry' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'canvassing', label: 'Canvassing' },
  { value: 'repeat', label: 'Repeat Client' },
  { value: 'other', label: 'Other' },
];

export function ValuationDialog({ open, onOpenChange, onSave, agencyId, branchId }: ValuationDialogProps) {
  const [propertyAddress, setPropertyAddress] = useState('');
  const [valuationType, setValuationType] = useState('');
  const [valuationDate, setValuationDate] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form fields when dialog opens
  useEffect(() => {
    if (open) {
      setPropertyAddress('');
      setValuationType('');
      setValuationDate(new Date().toISOString().split('T')[0]);
      setEstimatedValue('');
      setOwnerName('');
      setOwnerContact('');
      setSource('');
      setNotes('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!propertyAddress || !valuationType || !valuationDate) {
      alert('Please fill in all required fields (Address, Valuation Type, Date).');
      return;
    }

    if (!agencyId) {
      alert('Agency ID is required to create a valuation.');
      return;
    }

    setIsSaving(true);
    try {
      const movementData = {
        address: propertyAddress,
        type: valuationType === 'both' ? 'sale' : valuationType,
        status: 'valuation',
        date: valuationDate,
        price: estimatedValue ? parseFloat(estimatedValue.replace(/[£,]/g, '')) : null,
        client_name: ownerName || null,
        client_email: ownerContact || null,
        branch_id: branchId || null,
        notes: notes || null,
      };

      const created = await createMovement(agencyId, movementData);
      
      if (created) {
        if (onSave) {
          onSave(created);
        }
        onOpenChange(false);
      } else {
        alert('Failed to create valuation. Please try again.');
      }
    } catch (error) {
      console.error('Error creating valuation:', error);
      alert('An error occurred while creating the valuation.');
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
          <DialogTitle className="text-foreground text-xl">Book Valuation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="property-address" className="text-foreground">
              Property Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="property-address"
              type="text"
              placeholder="123 High Street, London, SW1A 1AA"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valuation-type" className="text-foreground">
                Valuation Type <span className="text-destructive">*</span>
              </Label>
              <Select value={valuationType} onValueChange={setValuationType}>
                <SelectTrigger id="valuation-type" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {valuationTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valuation-date" className="text-foreground">
                Valuation Date <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="valuation-date"
                  type="date"
                  value={valuationDate}
                  onChange={(e) => setValuationDate(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-value" className="text-foreground">
              Estimated Value
            </Label>
            <Input
              id="estimated-value"
              type="text"
              placeholder="£500,000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-name" className="text-foreground">
                Owner Name
              </Label>
              <Input
                id="owner-name"
                type="text"
                placeholder="John Smith"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-contact" className="text-foreground">
                Owner Contact
              </Label>
              <Input
                id="owner-contact"
                type="text"
                placeholder="john@email.com"
                value={ownerContact}
                onChange={(e) => setOwnerContact(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source" className="text-foreground">
              Lead Source
            </Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="source" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="How did they find us?" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {sourceOptions.map(option => (
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
              placeholder="Any additional notes about the valuation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background text-foreground min-h-[80px]"
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
            {isSaving ? 'Creating...' : 'Book Valuation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
