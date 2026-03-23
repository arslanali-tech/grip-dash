import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LegalSignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { price: string; broker: string; client: string; vendor: string; notes: string }) => void;
  movementId: string;
}

const priceOptions = [
  { value: '100000', label: '£100,000' },
  { value: '250000', label: '£250,000' },
  { value: '500000', label: '£500,000' },
  { value: 'custom', label: 'Custom Price' },
];

const brokerOptions = [
  { value: 'broker1', label: 'Broker 1' },
  { value: 'broker2', label: 'Broker 2' },
];

const clientOptions = [
  { value: 'client1', label: 'Client 1' },
  { value: 'client2', label: 'Client 2' },
];

const vendorOptions = [
  { value: 'vendor1', label: 'Vendor 1' },
  { value: 'vendor2', label: 'Vendor 2' },
];

export function LegalSignupDialog({ open, onOpenChange, onSave, movementId }: LegalSignupDialogProps) {
  const [price, setPrice] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [broker, setBroker] = useState('');
  const [client, setClient] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form fields when dialog opens
  useEffect(() => {
    if (open) {
      setPrice('');
      setCustomPrice('');
      setBroker('');
      setClient('');
      setVendor('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleSave = () => {
    const finalPrice = price === 'custom' ? customPrice : price;
    if (!finalPrice || !broker || !client || !vendor) {
      alert('Please fill in all required fields.');
      return;
    }
    const legalSignupDetails = { price: finalPrice, broker, client, vendor, notes };
    console.log('LegalSignupDialog: Saving data:', legalSignupDetails);
    onSave(legalSignupDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Legal Signup</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="price" className="text-foreground">
              Price
            </Label>
            <Select value={price} onValueChange={setPrice}>
              <SelectTrigger id="price" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose an option..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {priceOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {price === 'custom' && (
              <Input
                type="text"
                placeholder="Enter custom price"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="bg-background text-foreground mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker" className="text-foreground">
              Broker
            </Label>
            <Select value={broker} onValueChange={setBroker}>
              <SelectTrigger id="broker" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose some options..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {brokerOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client" className="text-foreground">
              Client
            </Label>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger id="client" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Choose some options..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {clientOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
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
                {vendorOptions.map(option => (
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
