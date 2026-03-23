import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClockIcon, CalendarIcon, MailIcon } from 'lucide-react';

interface ScheduleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  currentFrequency?: string;
}

export function ScheduleReportDialog({ open, onOpenChange, reportName, currentFrequency = 'weekly' }: ScheduleReportDialogProps) {
  const [frequency, setFrequency] = useState(currentFrequency);
  const [time, setTime] = useState('09:00');
  const [recipients, setRecipients] = useState('');

  useEffect(() => {
    if (open) {
      setFrequency(currentFrequency);
      setTime('09:00');
      setRecipients('');
    }
  }, [open, currentFrequency]);

  const handleSave = () => {
    console.log('Saving schedule:', { frequency, time, recipients });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Schedule Report
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure automated delivery for "{reportName}"
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Delivery Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Recipients</Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="email@example.com, manager@example.com"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="pl-9 bg-background text-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
