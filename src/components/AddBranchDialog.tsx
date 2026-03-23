import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2Icon, PlusIcon, XIcon } from 'lucide-react';

interface AddBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newBranch: any) => void;
}

export function AddBranchDialog({ open, onOpenChange, onSave }: AddBranchDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    teamSize: '',
    address: '',
    city: '',
    postcode: '',
    phone: '',
    email: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('Please enter a branch name');
      return;
    }
    
    onSave({
      ...formData,
      id: `branch-${Date.now()}`,
      teamSize: parseInt(formData.teamSize) || 0,
      activeListings: 0,
      totalSales: 0
    });
    
    setFormData({
        name: '',
        manager: '',
        teamSize: '',
        address: '',
        city: '',
        postcode: '',
        phone: '',
        email: ''
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <Building2Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Add New Branch
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name" className="text-foreground">Branch Name</Label>
            <Input
              id="branch-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="bg-background text-foreground"
              placeholder="e.g. North London"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manager" className="text-foreground">Branch Manager</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => handleChange('manager', e.target.value)}
                className="bg-background text-foreground"
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-size" className="text-foreground">Team Size</Label>
              <Input
                id="team-size"
                type="number"
                value={formData.teamSize}
                onChange={(e) => handleChange('teamSize', e.target.value)}
                className="bg-background text-foreground"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="bg-background text-foreground"
              placeholder="Street Address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-foreground">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="bg-background text-foreground"
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode" className="text-foreground">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleChange('postcode', e.target.value)}
                className="bg-background text-foreground"
                placeholder="Postcode"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-background text-foreground"
                placeholder="Phone Number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="bg-background text-foreground"
                placeholder="Email Address"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Add Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
