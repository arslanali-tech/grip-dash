import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2Icon, SendIcon, FileTextIcon, AlertCircle, CheckCircle2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DocuSignTemplate,
  fetchDocuSignTemplates,
  sendSignupOrderAgreement,
} from '@/lib/ownerApi';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  contactName?: string;
  email: string;
}

interface SendAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess?: () => void;
}

export function SendAgreementDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: SendAgreementDialogProps) {
  const [templates, setTemplates] = useState<DocuSignTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Load templates on dialog open
  useEffect(() => {
    if (open) {
      setSendSuccess(false);
      setFormErrors({});
      loadTemplates();
    }
  }, [open]);

  // Pre-fill form when client changes
  useEffect(() => {
    if (client) {
      setRecipientName(client.contactName || client.name || '');
      setRecipientEmail(client.email || '');
      setEmailSubject(`GRIP Service Agreement for ${client.name || 'your agency'}`);
    } else {
      setRecipientName('');
      setRecipientEmail('');
      setEmailSubject('');
    }
  }, [client]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await fetchDocuSignTemplates();
      setTemplates(result);
      // Auto-select first template if available
      if (result.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(result[0].templateId);
      }
    } catch (e) {
      console.error('Error loading templates', e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!recipientName.trim()) {
      errors.recipientName = 'Recipient name is required';
    }

    if (!recipientEmail.trim()) {
      errors.recipientEmail = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      errors.recipientEmail = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setIsSending(true);
    try {
      const result = await sendSignupOrderAgreement({
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        templateId: selectedTemplateId || undefined,
        emailSubject: emailSubject.trim() || undefined,
      });

      if (result?.envelopeId) {
        setSendSuccess(true);
        toast({
          title: 'Agreement Sent',
          description: `DocuSign agreement has been sent to ${recipientEmail}`,
        });
        onSuccess?.();
        // Auto-close after success
        setTimeout(() => {
          onOpenChange(false);
          setSendSuccess(false);
        }, 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Send Failed',
          description: 'Could not send the agreement. Please try again.',
        });
      }
    } catch (e) {
      console.error('Error sending agreement', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while sending the agreement.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false);
      setSendSuccess(false);
      setFormErrors({});
    }
  };

  const isFormValid = recipientName.trim() !== '' && recipientEmail.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-xl">
            <FileTextIcon className="h-5 w-5 text-primary" />
            Send DocuSign Agreement
          </DialogTitle>
        </DialogHeader>

        {sendSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="p-4 bg-success/10 rounded-full">
              <CheckCircle2Icon className="h-12 w-12 text-success" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg text-foreground">Agreement Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The DocuSign agreement has been sent to {recipientEmail}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {client && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Sending to client:</p>
                <p className="font-medium text-foreground">{client.name}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipient-name" className="text-foreground">
                Recipient Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recipient-name"
                type="text"
                placeholder="John Smith"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (formErrors.recipientName) {
                    setFormErrors((prev) => ({ ...prev, recipientName: '' }));
                  }
                }}
                className={cn(
                  'bg-background text-foreground',
                  formErrors.recipientName && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {formErrors.recipientName && (
                <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.recipientName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email" className="text-foreground">
                Recipient Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="john@example.com"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  if (formErrors.recipientEmail) {
                    setFormErrors((prev) => ({ ...prev, recipientEmail: '' }));
                  }
                }}
                className={cn(
                  'bg-background text-foreground',
                  formErrors.recipientEmail && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {formErrors.recipientEmail && (
                <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.recipientEmail}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-select" className="text-foreground">
                Agreement Template
              </Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={loadingTemplates}
              >
                <SelectTrigger id="template-select" className="bg-background text-foreground border-border">
                  {loadingTemplates ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      Loading templates...
                    </span>
                  ) : (
                    <SelectValue placeholder="Select a template (optional)" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="">Use default template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.templateId} value={template.templateId}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a DocuSign template or leave empty to use the default.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject" className="text-foreground">
                Email Subject
              </Label>
              <Input
                id="email-subject"
                type="text"
                placeholder="GRIP Service Agreement"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-background text-foreground"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSending}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {sendSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!sendSuccess && (
            <Button
              onClick={handleSend}
              disabled={!isFormValid || isSending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" />
                  Send Agreement
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
