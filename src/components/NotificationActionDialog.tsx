import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarIcon, CheckCircle2Icon, XCircleIcon, UserIcon, ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: {
    type: 'holiday' | 'absence' | 'offer';
    title: string;
    description: string;
    details?: string;
  };
  onAccept: (notes?: string) => void;
  onDecline: (reason: string) => void;
}

export function NotificationActionDialog({ 
  open, 
  onOpenChange, 
  notification,
  onAccept,
  onDecline 
}: NotificationActionDialogProps) {
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);
  const [reason, setReason] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (action === 'accept') {
      onAccept(notes || undefined);
      onOpenChange(false);
    } else if (action === 'decline') {
      if (!reason.trim()) {
        alert('Please provide a reason for declining');
        return;
      }
      const trimmedReason = reason.trim();
      const trimmedDeclineNotes = declineNotes.trim();
      const finalReason = trimmedDeclineNotes
        ? `${trimmedReason}\n\nAdditional notes: ${trimmedDeclineNotes}`
        : trimmedReason;
      onDecline(finalReason);
      onOpenChange(false);
    }
    
    // Reset
    setAction(null);
    setReason('');
    setDeclineNotes('');
    setNotes('');
  };

  const handleCancel = () => {
    setAction(null);
    setReason('');
    setDeclineNotes('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Notification Details */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                notification.type === 'holiday' ? "bg-blue-100 dark:bg-blue-900/30" :
                notification.type === 'absence' ? "bg-orange-100 dark:bg-orange-900/30" :
                "bg-green-100 dark:bg-green-900/30"
              )}>
                {notification.type === 'holiday' || notification.type === 'absence' ? (
                  <CalendarIcon className={cn(
                    "h-5 w-5",
                    notification.type === 'holiday' ? "text-blue-600" : "text-orange-600"
                  )} strokeWidth={1.5} />
                ) : (
                  <CheckCircle2Icon className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{notification.description}</p>
                {notification.details && (
                  <p className="text-sm text-muted-foreground mt-1">{notification.details}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Selection */}
          {!action ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setAction('accept')}
                className="h-auto py-4 flex-col gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2Icon className="h-6 w-6" strokeWidth={1.5} />
                <span className="font-semibold">Accept</span>
              </Button>
              <Button
                onClick={() => setAction('decline')}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <XCircleIcon className="h-6 w-6" strokeWidth={1.5} />
                <span className="font-semibold">Decline</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {action === 'accept' ? (
                <div className="space-y-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                    <CheckCircle2Icon className="h-5 w-5" strokeWidth={1.5} />
                    <span>Accepting Request</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accept-notes" className="text-foreground">
                      Notes (Optional)
                    </Label>
                    <Textarea
                      id="accept-notes"
                      placeholder="Add any notes or comments..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-background text-foreground min-h-[80px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be added to the calendar and the requester will be notified.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold">
                    <XCircleIcon className="h-5 w-5" strokeWidth={1.5} />
                    <span>Declining Request</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="decline-reason" className="text-foreground">
                      Rejection Reason<span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="decline-reason"
                      placeholder="Please provide a reason for declining this request..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-background text-foreground min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="decline-notes" className="text-foreground">
                      Additional Notes (Optional)
                    </Label>
                    <Textarea
                      id="decline-notes"
                      placeholder="Add extra context for the requester..."
                      value={declineNotes}
                      onChange={(e) => setDeclineNotes(e.target.value)}
                      className="bg-background text-foreground min-h-[70px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The requester will be notified with your reason.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          {action && (
            <Button
              onClick={handleConfirm}
              className={cn(
                action === 'accept' 
                  ? "bg-green-600 text-white hover:bg-green-700" 
                  : "bg-red-600 text-white hover:bg-red-700"
              )}
            >
              {action === 'accept' ? 'Confirm Accept' : 'Confirm Decline'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
