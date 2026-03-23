import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface PnLSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PnLSettingsDialog({ open, onOpenChange }: PnLSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Financial Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">General</h4>
            
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="currency" className="text-foreground">Currency</Label>
              <Select defaultValue="gbp">
                <SelectTrigger id="currency" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="fiscal-year" className="text-foreground">Fiscal Year Start</Label>
              <Select defaultValue="jan">
                <SelectTrigger id="fiscal-year" className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="jan">January</SelectItem>
                  <SelectItem value="apr">April</SelectItem>
                  <SelectItem value="jul">July</SelectItem>
                  <SelectItem value="oct">October</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Display Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Display</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-decimals" className="text-foreground">Show Decimals</Label>
              <Switch id="show-decimals" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="compact-view" className="text-foreground">Compact View</Label>
              <Switch id="compact-view" />
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="negative-red" className="text-foreground">Highlight Negatives</Label>
              <Switch id="negative-red" defaultChecked />
            </div>
          </div>

           <Separator className="bg-border" />

           {/* Data Management */}
           <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data</h4>
             <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                    Reset to Defaults
                </Button>
             </div>
           </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
