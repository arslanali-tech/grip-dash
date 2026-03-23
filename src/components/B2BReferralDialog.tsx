import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloudIcon, FileIcon, TrashIcon, LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UkAddressAutocompleteInput } from './UkAddressAutocompleteInput';
import { notifyError } from '@/lib/notify';

interface B2BReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    referredTo: string;
    propertyAddress: string;
    transactionType: string;
    date: string;
    link: string;
    documents: File[];
    contactName: string;
    notes: string;
  }) => void;
  movementId: string;
  availableCompanies: Array<{ id: string; name: string; type: string }>;
}

export function B2BReferralDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  movementId,
  availableCompanies 
}: B2BReferralDialogProps) {
  const [referredTo, setReferredTo] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [date, setDate] = useState('');
  const [link, setLink] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setReferredTo('');
      setPropertyAddress('');
      setTransactionType('');
      setLink('');
      setDocuments([]);
      setContactName('');
      setNotes('');
    }
  }, [open, movementId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!referredTo || !propertyAddress || !date || !contactName) {
      notifyError('Please fill in all required fields: Referred To, Property Address, Date, and Contact Name');
      return;
    }

    // Check if legal referral and transaction type is required
    const selectedCompany = availableCompanies.find(c => c.name === referredTo);
    const isLegalReferral = selectedCompany?.type === 'Legal' || selectedCompany?.type === 'Conveyancing';
    
    if (isLegalReferral && !transactionType) {
      notifyError('Please select a transaction type for legal referrals');
      return;
    }

    const referralData = {
      referredTo,
      propertyAddress,
      transactionType,
      date,
      link,
      documents,
      contactName,
      notes,
    };

    console.log('B2BReferralDialog: Saving data:', referralData);
    onSave(referralData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">B2B Referral</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Referred To */}
          <div className="space-y-2">
            <Label htmlFor="referred-to" className="text-foreground">
              Referred to<span className="text-destructive">*</span>
            </Label>
            <Select value={referredTo} onValueChange={setReferredTo}>
              <SelectTrigger id="referred-to" className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {availableCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{company.name}</span>
                      <span className="text-xs text-muted-foreground">({company.type})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property Address */}
          <div className="space-y-2">
            <Label htmlFor="property-address" className="text-foreground">
              Property Address<span className="text-destructive">*</span>
            </Label>
            <UkAddressAutocompleteInput
              id="property-address"
              value={propertyAddress}
              onValueChange={setPropertyAddress}
            />
            <p className="text-xs text-muted-foreground">
              Search any UK address or postcode.
            </p>
          </div>

          {/* Transaction Type (Only for Legal/Conveyancing) */}
          {(() => {
            const selectedCompany = availableCompanies.find(c => c.name === referredTo);
            const isLegalReferral = selectedCompany?.type === 'Legal' || selectedCompany?.type === 'Conveyancing';
            
            if (isLegalReferral) {
              return (
                <div className="space-y-2 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <Label htmlFor="transaction-type" className="text-foreground">
                    Transaction Type<span className="text-destructive">*</span>
                  </Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger id="transaction-type" className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Select transaction type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="purchase-1">Purchase (1)</SelectItem>
                      <SelectItem value="purchase-2">Purchase (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            return null;
          })()}


          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="referral-date" className="text-foreground">
              Date<span className="text-destructive">*</span>
            </Label>
            <Input
              id="referral-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          {/* Insert Link */}
          <div className="space-y-2">
            <Label htmlFor="link" className="text-foreground">
              Insert link
            </Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input
                id="link"
                type="url"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="bg-background text-foreground pl-10"
              />
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <Label className="text-foreground">Document upload</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <UploadCloudIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">
                Click to upload documents
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX, JPG, PNG (max 10MB each)
              </p>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="space-y-2 mt-3">
                {documents.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-foreground truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => handleRemoveDocument(index)}
                    >
                      <TrashIcon className="h-3 w-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Name of Individual Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact-name" className="text-foreground">
              Name of individual contact<span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-name"
              type="text"
              placeholder="e.g., John Smith"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="bg-background text-foreground"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background text-foreground min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
