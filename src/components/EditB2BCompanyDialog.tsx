import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EditIcon } from 'lucide-react';
import { B2BCompany, B2BReferralType } from './views/B2BReferralsView';

interface EditB2BCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: B2BCompany | null;
  onSave: (data: B2BCompany) => void;
}

export function EditB2BCompanyDialog({ open, onOpenChange, company, onSave }: EditB2BCompanyDialogProps) {
  const knownReferralTypes = ['mortgage', 'aml', 'legal', 'conveyancing'] as const;
  const [formData, setFormData] = useState<B2BCompany | null>(null);
  const [customType, setCustomType] = useState('');

  const selectedTypeValue =
    formData && knownReferralTypes.includes(formData.type as typeof knownReferralTypes[number])
      ? formData.type
      : 'custom';

  useEffect(() => {
    if (company) {
      setFormData(company);
      const isKnownType = knownReferralTypes.includes(company.type as typeof knownReferralTypes[number]);
      setCustomType(isKnownType ? '' : company.type);
    }
  }, [company]);

  const handleSave = () => {
    if (!formData) return;

    if (!formData.name || !formData.contactName || !formData.contactEmail) {
      alert('Please fill in all required fields');
      return;
    }
    if (!formData.type || !String(formData.type).trim()) {
      alert('Please choose or enter a referral type.');
      return;
    }

    onSave(formData);
    onOpenChange(false);
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[600px] bg-card text-card-foreground max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <EditIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Edit {formData.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Company Details */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-semibold text-sm text-foreground">Company Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company-name" className="text-foreground">
                  Company Name<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company-name"
                  placeholder="e.g., L&C Mortgages"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="company-type" className="text-foreground">
                  Referral Type<span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedTypeValue}
                  onValueChange={(value) => {
                    if (!formData) return;
                    if (value === 'custom') {
                      const normalizedCustom = customType.trim().toLowerCase();
                      setFormData({
                        ...formData,
                        type: (normalizedCustom || 'custom') as B2BReferralType,
                      });
                      return;
                    }
                    setFormData({ ...formData, type: value as B2BReferralType });
                  }}
                >
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="mortgage">Mortgage Referrals</SelectItem>
                    <SelectItem value="aml">AML Referrals</SelectItem>
                    <SelectItem value="legal">Legal Referrals</SelectItem>
                    <SelectItem value="conveyancing">Conveyancing</SelectItem>
                    <SelectItem value="custom">Custom Type</SelectItem>
                  </SelectContent>
                </Select>
                {selectedTypeValue === 'custom' && (
                  <div className="space-y-2 pt-2">
                    <Input
                      id="custom-company-type"
                      placeholder="e.g., Utilities Referrals"
                      value={customType}
                      onChange={(e) => {
                        if (!formData) return;
                        const next = e.target.value;
                        setCustomType(next);
                        setFormData({
                          ...formData,
                          type: (next.trim().toLowerCase() || 'custom') as B2BReferralType,
                        });
                      }}
                      className="bg-background text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add your own referral type.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm text-foreground">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contact-name" className="text-foreground">
                  Contact Name<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-name"
                  placeholder="John Smith"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-foreground">
                  Email<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone" className="text-foreground">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  placeholder="020 7123 4567"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Commission Settings */}
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-sm text-foreground">Commission Settings</h3>
            
            <div className="space-y-3">
              <Label className="text-foreground">Commission Type</Label>
              <RadioGroup 
                value={formData.commissionType} 
                onValueChange={(value: 'fixed' | 'percentage') => setFormData({ ...formData, commissionType: value })}
              >
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed-edit" />
                    <Label htmlFor="fixed-edit" className="cursor-pointer">Fixed Amount (£)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage-edit" />
                    <Label htmlFor="percentage-edit" className="cursor-pointer">Percentage (%)</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission-value" className="text-foreground">
                Commission {formData.commissionType === 'fixed' ? 'Amount (£)' : 'Rate (%)'}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="commission-value"
                type="number"
                placeholder={formData.commissionType === 'fixed' ? '350' : '15'}
                value={formData.commissionValue || ''}
                onChange={(e) => setFormData({ ...formData, commissionValue: parseFloat(e.target.value) || 0 })}
                className="bg-background text-foreground"
                step={formData.commissionType === 'percentage' ? '0.1' : '1'}
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about this partnership..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-background text-foreground min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

