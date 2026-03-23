import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShareIcon, MailIcon, CopyIcon, CheckIcon } from 'lucide-react';

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
}

export function ShareReportDialog({ open, onOpenChange, reportName }: ShareReportDialogProps) {
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const shareLink = `https://grip.app/reports/share/${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (open) {
      setEmails('');
      setMessage(`Here is the ${reportName} you requested.`);
      setCopied(false);
    }
  }, [open, reportName]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    console.log('Sharing report:', { emails, message });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <ShareIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Share Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Share Link</Label>
            <div className="flex gap-2">
              <Input 
                value={shareLink} 
                readOnly 
                className="bg-muted text-muted-foreground font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or send via email</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails" className="text-foreground">Recipients</Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="emails"
                placeholder="Enter email addresses (comma separated)"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                className="pl-9 bg-background text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-foreground">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-background text-foreground min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleShare} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Send Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
