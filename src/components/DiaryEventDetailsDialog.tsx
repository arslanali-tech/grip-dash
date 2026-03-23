import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircleIcon, CalendarIcon, ClockIcon, MapPinIcon, RefreshCwIcon } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
  propertyAddress?: string;
  feedback?: {
    status: 'attended' | 'not-attended' | 'rescheduled' | 'cancelled';
    reason?: string;
    rescheduleDate?: string;
    rescheduleTime?: string;
    notes?: string;
  };
}

interface DiaryEventDetailsDialogProps {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (feedback: CalendarEvent['feedback']) => void;
  onLogMileage?: () => void;
}

export function DiaryEventDetailsDialog({
  event,
  onClose,
  onSave,
  onLogMileage,
}: DiaryEventDetailsDialogProps) {
  const [rescheduleDate, setRescheduleDate] = useState(
    event.feedback?.rescheduleDate || format(event.start, 'yyyy-MM-dd')
  );
  const [rescheduleTime, setRescheduleTime] = useState(
    event.feedback?.rescheduleTime || format(event.start, 'HH:mm')
  );
  const [reason, setReason] = useState(event.feedback?.reason || '');
  const [notes, setNotes] = useState(event.feedback?.notes || '');

  useEffect(() => {
    setRescheduleDate(event.feedback?.rescheduleDate || format(event.start, 'yyyy-MM-dd'));
    setRescheduleTime(event.feedback?.rescheduleTime || format(event.start, 'HH:mm'));
    setReason(event.feedback?.reason || '');
    setNotes(event.feedback?.notes || '');
  }, [event.id, event.start, event.feedback]);

  const handleReschedule = () => {
    if (!rescheduleDate || !rescheduleTime) {
      alert('Please select a new date and time.');
      return;
    }

    onSave({
      status: 'rescheduled',
      reason: reason || undefined,
      rescheduleDate,
      rescheduleTime,
      notes: notes || undefined,
    });
  };

  const handleCancel = () => {
    onSave({
      status: 'cancelled',
      reason: reason || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            {event.title} Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="font-medium text-foreground">
                {format(event.start, 'EEEE, MMMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-foreground">
                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
              </span>
            </div>
            {event.propertyAddress && (
              <div className="flex items-center gap-2 text-sm">
                <MapPinIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-foreground">{event.propertyAddress}</span>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <Label className="text-foreground font-semibold flex items-center gap-2">
              <RefreshCwIcon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
              Reschedule
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date" className="text-foreground">
                  New Date
                </Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-time" className="text-foreground">
                  New Time
                </Label>
                <Input
                  id="reschedule-time"
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-foreground">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Add a brief reason (optional)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-background text-foreground min-h-[70px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional comments or observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background text-foreground min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Close
            </Button>
            {onLogMileage && (
              <Button
                variant="outline"
                onClick={onLogMileage}
                className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/10"
              >
                Log Mileage
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <AlertCircleIcon className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleReschedule} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Reschedule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
