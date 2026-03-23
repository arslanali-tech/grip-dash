import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BellIcon } from 'lucide-react';

interface DocumentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
}

export function DocumentReminderDialog({ open, onOpenChange, documentName }: DocumentReminderDialogProps) {
  const [expiryDate, setExpiryDate] = useState('');
  const [alertDate, setAlertDate] = useState('');

  const handleSave = () => {
    // Implement reminder logic
    console.log(`Setting reminder for ${documentName}: Expiry ${expiryDate}, Alert ${alertDate}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <BellIcon className="h-5 w-5 text-primary" />
            Set Reminder for "{documentName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expiry-date" className="text-foreground">Expiry Date</Label>
            <Input 
              id="expiry-date" 
              type="date" 
              value={expiryDate} 
              onChange={(e) => setExpiryDate(e.target.value)} 
              className="bg-background text-foreground border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="alert-date" className="text-foreground">Alert Me Date</Label>
            <Input 
              id="alert-date" 
              type="date" 
              value={alertDate} 
              onChange={(e) => setAlertDate(e.target.value)} 
              className="bg-background text-foreground border-border"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-foreground hover:bg-accent">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Set Reminder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
