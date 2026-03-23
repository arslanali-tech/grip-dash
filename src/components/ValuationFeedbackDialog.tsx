import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  XIcon, 
  CheckCircle2Icon, 
  XCircleIcon, 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  MapPinIcon,
  AlertCircleIcon,
  CarIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
  vendorName?: string;
  propertyAddress?: string;
  feedback?: {
    status: 'attended' | 'not-attended' | 'rescheduled' | 'cancelled';
    reason?: string;
    rescheduleDate?: string;
    rescheduleTime?: string;
    notes?: string;
  };
}

interface ValuationFeedbackDialogProps {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (feedback: CalendarEvent['feedback']) => void;
  onLogMileage?: () => void;
}

export function ValuationFeedbackDialog({ event, onClose, onSave, onLogMileage }: ValuationFeedbackDialogProps) {
  const [feedbackStatus, setFeedbackStatus] = useState<'attended' | 'not-attended' | 'rescheduled' | 'cancelled'>(
    event.feedback?.status || 'attended'
  );
  const [reason, setReason] = useState(event.feedback?.reason || '');
  const [rescheduleDate, setRescheduleDate] = useState(event.feedback?.rescheduleDate || '');
  const [rescheduleTime, setRescheduleTime] = useState(event.feedback?.rescheduleTime || '');
  const [notes, setNotes] = useState(event.feedback?.notes || '');

  const handleSave = () => {
    if (feedbackStatus === 'rescheduled' && (!rescheduleDate || !rescheduleTime)) {
      alert('Please select a new date and time.');
      return;
    }

    const feedback = {
      status: feedbackStatus,
      reason: feedbackStatus !== 'attended' ? reason : undefined,
      rescheduleDate: feedbackStatus === 'rescheduled' ? rescheduleDate : undefined,
      rescheduleTime: feedbackStatus === 'rescheduled' ? rescheduleTime : undefined,
      notes: notes || undefined,
    };

    onSave(feedback);
  };

  const isValuation = event.category === 'valuation';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            {event.title} Feedback
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Details */}
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
            {isValuation && event.vendorName && (
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="font-medium text-foreground">{event.vendorName}</span>
              </div>
            )}
            {isValuation && event.propertyAddress && (
              <div className="flex items-center gap-2 text-sm">
                <MapPinIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-foreground">{event.propertyAddress}</span>
              </div>
            )}
          </div>

          {/* Feedback Status */}
          <div className="space-y-3">
            <Label className="text-foreground font-semibold">Appointment Status</Label>
            <RadioGroup value={feedbackStatus} onValueChange={(value: any) => setFeedbackStatus(value)}>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  feedbackStatus === 'attended' 
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                    : "border-border hover:border-green-300"
                )}>
                  <RadioGroupItem value="attended" id="attended" />
                  <Label htmlFor="attended" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CheckCircle2Icon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
                    <span className="font-medium">Attended</span>
                  </Label>
                </div>

                <div className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  feedbackStatus === 'not-attended' 
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                    : "border-border hover:border-red-300"
                )}>
                  <RadioGroupItem value="not-attended" id="not-attended" />
                  <Label htmlFor="not-attended" className="flex items-center gap-2 cursor-pointer flex-1">
                    <XCircleIcon className="h-4 w-4 text-red-600" strokeWidth={1.5} />
                    <span className="font-medium">Not Attended</span>
                  </Label>
                </div>

                <div className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  feedbackStatus === 'rescheduled' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                    : "border-border hover:border-blue-300"
                )}>
                  <RadioGroupItem value="rescheduled" id="rescheduled" />
                  <Label htmlFor="rescheduled" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CalendarIcon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                    <span className="font-medium">Reschedule</span>
                  </Label>
                </div>

                <div className={cn(
                  "flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  feedbackStatus === 'cancelled' 
                    ? "border-gray-500 bg-gray-50 dark:bg-gray-950/20" 
                    : "border-border hover:border-gray-300"
                )}>
                  <RadioGroupItem value="cancelled" id="cancelled" />
                  <Label htmlFor="cancelled" className="flex items-center gap-2 cursor-pointer flex-1">
                    <AlertCircleIcon className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
                    <span className="font-medium">Cancelled</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Fields based on Status */}
          {feedbackStatus === 'not-attended' && (
            <div className="space-y-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <Label htmlFor="reason" className="text-foreground font-semibold">
                Reason for Non-Attendance
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., Vendor didn't answer door, wrong address, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background text-foreground min-h-[80px]"
              />
            </div>
          )}

          {feedbackStatus === 'rescheduled' && (
            <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <Label className="text-foreground font-semibold">Reschedule Details</Label>
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
              <div className="space-y-2">
                <Label htmlFor="reschedule-reason" className="text-foreground">
                  Reason for Rescheduling
                </Label>
                <Textarea
                  id="reschedule-reason"
                  placeholder="e.g., Vendor requested different time, conflict in schedule, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-background text-foreground min-h-[60px]"
                />
              </div>
            </div>
          )}

          {feedbackStatus === 'cancelled' && (
            <div className="space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800">
              <Label htmlFor="cancel-reason" className="text-foreground font-semibold">
                Reason for Cancellation
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="e.g., Vendor no longer interested, property already sold, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background text-foreground min-h-[80px]"
              />
            </div>
          )}

          {/* Additional Notes */}
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
              Cancel
            </Button>
            {onLogMileage && (
              <Button
                variant="outline"
                onClick={onLogMileage}
                className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/10"
              >
                <CarIcon className="h-4 w-4" />
                Log Mileage
              </Button>
            )}
          </div>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Send Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
