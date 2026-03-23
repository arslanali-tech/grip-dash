import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createMovement } from '@/lib/dashboardApi';

interface LettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (data: any) => void;
  agencyId?: string;
  branchId?: string;
}

const propertyTypeOptions = [
  { value: 'flat', label: 'Flat/Apartment' },
  { value: 'house', label: 'House' },
  { value: 'studio', label: 'Studio' },
  { value: 'room', label: 'Room' },
  { value: 'commercial', label: 'Commercial' },
];

const lettingTypeOptions = [
  { value: 'long-term', label: 'Long Term (6+ months)' },
  { value: 'short-term', label: 'Short Term' },
  { value: 'corporate', label: 'Corporate Let' },
  { value: 'hmo', label: 'HMO' },
];

const furnishedOptions = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'part-furnished', label: 'Part Furnished' },
];

export function LettingDialog({ open, onOpenChange, onSave, agencyId, branchId }: LettingDialogProps) {
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [lettingType, setLettingType] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [furnished, setFurnished] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [landlordContact, setLandlordContact] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantContact, setTenantContact] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form fields when dialog opens
  useEffect(() => {
    if (open) {
      setPropertyAddress('');
      setPropertyType('');
      setLettingType('');
      setRentAmount('');
      setFurnished('');
      setBedrooms('');
      setAvailableDate(new Date().toISOString().split('T')[0]);
      setLandlordName('');
      setLandlordContact('');
      setTenantName('');
      setTenantContact('');
      setNotes('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!propertyAddress || !rentAmount) {
      alert('Please fill in required fields (Address, Rent Amount).');
      return;
    }

    if (!agencyId) {
      alert('Agency ID is required to create a letting.');
      return;
    }

    setIsSaving(true);
    try {
      const rentValue = parseFloat(rentAmount.replace(/[£,]/g, ''));
      
      const movementData = {
        address: propertyAddress,
        type: 'letting',
        status: 'on-books',
        date: availableDate || new Date().toISOString().split('T')[0],
        price: rentValue || null,
        client_name: landlordName || null,
        client_email: landlordContact || null,
        branch_id: branchId || null,
        notes: [
          propertyType && `Property Type: ${propertyType}`,
          lettingType && `Letting Type: ${lettingType}`,
          furnished && `Furnished: ${furnished}`,
          bedrooms && `Bedrooms: ${bedrooms}`,
          tenantName && `Tenant: ${tenantName}`,
          tenantContact && `Tenant Contact: ${tenantContact}`,
          notes
        ].filter(Boolean).join('\n'),
      };

      const created = await createMovement(agencyId, movementData);
      
      if (created) {
        if (onSave) {
          onSave(created);
        }
        onOpenChange(false);
      } else {
        alert('Failed to create letting. Please try again.');
      }
    } catch (error) {
      console.error('Error creating letting:', error);
      alert('An error occurred while creating the letting.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Add New Letting</DialogTitle>
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
              <Label htmlFor="property-type" className="text-foreground">
                Property Type
              </Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="property-type" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {propertyTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="text-foreground">
                Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                placeholder="2"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent-amount" className="text-foreground">
                Rent (PCM) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rent-amount"
                type="text"
                placeholder="£1,500"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="available-date" className="text-foreground">
                Available From
              </Label>
              <Input
                id="available-date"
                type="date"
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="letting-type" className="text-foreground">
                Letting Type
              </Label>
              <Select value={lettingType} onValueChange={setLettingType}>
                <SelectTrigger id="letting-type" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {lettingTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="furnished" className="text-foreground">
                Furnished
              </Label>
              <Select value={furnished} onValueChange={setFurnished}>
                <SelectTrigger id="furnished" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {furnishedOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Landlord Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="landlord-name" className="text-foreground">
                  Landlord Name
                </Label>
                <Input
                  id="landlord-name"
                  type="text"
                  placeholder="Jane Doe"
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landlord-contact" className="text-foreground">
                  Landlord Contact
                </Label>
                <Input
                  id="landlord-contact"
                  type="text"
                  placeholder="jane@email.com"
                  value={landlordContact}
                  onChange={(e) => setLandlordContact(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Tenant Details (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name" className="text-foreground">
                  Tenant Name
                </Label>
                <Input
                  id="tenant-name"
                  type="text"
                  placeholder="John Smith"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-contact" className="text-foreground">
                  Tenant Contact
                </Label>
                <Input
                  id="tenant-contact"
                  type="text"
                  placeholder="john@email.com"
                  value={tenantContact}
                  onChange={(e) => setTenantContact(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about the property..."
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
            {isSaving ? 'Creating...' : 'Add Letting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
