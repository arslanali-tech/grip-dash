import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2Icon, UserCheckIcon, Loader2Icon } from 'lucide-react';
import { fetchClientBranches } from '@/lib/dashboardApi';
import { UkAddressAutocompleteInput } from './UkAddressAutocompleteInput';

interface SendReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: any) => void;
  agencyId?: string;
  clientId?: string;
}

interface Branch {
  id: string;
  name: string;
}

export function SendReferralDialog({ open, onOpenChange, onSend, agencyId, clientId }: SendReferralDialogProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [referralType, setReferralType] = useState<'internal' | 'external'>('internal');
  const [formData, setFormData] = useState({
    propertyAddress: '',
    propertyType: '',
    estimatedValue: '',
    targetBranchId: '',
    targetBranchName: '',
    targetAgent: '',
    externalCompany: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    commission: '',
  });

  useEffect(() => {
    const loadBranches = async () => {
      if (!agencyId || !open) return;
      setLoadingBranches(true);
      console.log('[SendReferralDialog] Loading branches for agencyId:', agencyId);
      try {
        const branches = await fetchClientBranches(agencyId);
        console.log('[SendReferralDialog] Loaded branches:', branches.length, branches);
        setBranches(branches);
      } catch (err) {
        console.error('[SendReferralDialog] Error loading branches:', err);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    };
    void loadBranches();
  }, [agencyId, open]);

  const handleSend = () => {
    if (!formData.propertyAddress || !formData.estimatedValue) {
      alert('Please fill in property address and estimated value');
      return;
    }

    if (referralType === 'internal' && !formData.targetBranchId) {
      alert('Please select a target branch');
      return;
    }

    if (referralType === 'external' && (!formData.externalCompany || !formData.contactName)) {
      alert('Please select external company and contact name');
      return;
    }

    const referralData = {
      ...formData,
      targetBranch: formData.targetBranchName || formData.targetBranchId,
      referralType,
      direction: 'sent',
      status: 'pending',
      date: new Date().toISOString(),
    };

    onSend(referralData);
    
    // Reset form
    setFormData({
      propertyAddress: '',
      propertyType: '',
      estimatedValue: '',
      targetBranchId: '',
      targetBranchName: '',
      targetAgent: '',
      externalCompany: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      notes: '',
      commission: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Send Property Referral</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Refer a property to another branch or external GRIP company
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Referral Type Selection */}
          <div className="space-y-3">
            <Label className="text-foreground">Referral Type</Label>
            <RadioGroup value={referralType} onValueChange={(value: 'internal' | 'external') => setReferralType(value)}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2 flex-1">
                  <RadioGroupItem value="internal" id="internal" />
                  <Label htmlFor="internal" className="flex items-center gap-2 cursor-pointer">
                    <Building2Icon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
                    Internal Branch
                  </Label>
                </div>
                <div className="flex items-center space-x-2 flex-1">
                  <RadioGroupItem value="external" id="external" />
                  <Label htmlFor="external" className="flex items-center gap-2 cursor-pointer">
                    <UserCheckIcon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
                    External GRIP User
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Property Details */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
            <h3 className="font-semibold text-sm text-foreground">Property Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="property-address" className="text-foreground">
                Property Address<span className="text-destructive">*</span>
              </Label>
              <UkAddressAutocompleteInput
                id="property-address"
                value={formData.propertyAddress}
                onValueChange={(address) => setFormData({ ...formData, propertyAddress: address })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property-type" className="text-foreground">Property Type</Label>
                <Input
                  id="property-type"
                  placeholder="e.g., 3-bed Semi"
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated-value" className="text-foreground">
                  Estimated Value<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="estimated-value"
                  placeholder="£250,000"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Recipient Details */}
          {referralType === 'internal' ? (
            <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Building2Icon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
                Internal Branch Referral
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-branch" className="text-foreground">
                    Target Branch<span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.targetBranchId}
                    onValueChange={(branchId) => {
                      const match = branches.find((b) => b.id === branchId);
                      setFormData({ 
                        ...formData, 
                        targetBranchId: branchId, 
                        targetBranchName: match?.name ?? '' 
                      });
                    }}
                  >
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      {loadingBranches && (
                        <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                          <Loader2Icon className="h-3 w-3 animate-spin" />
                          Loading branches...
                        </div>
                      )}
                      {!loadingBranches && branches.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground">No branches found</div>
                      )}
                      {!loadingBranches && branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-agent" className="text-foreground">Target Agent</Label>
                  <Input
                    id="target-agent"
                    placeholder="Agent name (optional)"
                    value={formData.targetAgent}
                    onChange={(e) => setFormData({ ...formData, targetAgent: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <UserCheckIcon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
                External GRIP Company
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="external-company" className="text-foreground">
                  Company<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="external-company"
                  placeholder="Company name"
                  value={formData.externalCompany}
                  onChange={(e) => setFormData({ ...formData, externalCompany: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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
                  <Label htmlFor="contact-phone" className="text-foreground">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    placeholder="07700 900123"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-foreground">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commission" className="text-foreground">Expected Commission (£)</Label>
              <Input
                id="commission"
                placeholder="£4,500"
                value={formData.commission}
                onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any relevant information about the referral..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-background text-foreground min-h-[100px]"
              />
            </div>
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
            onClick={handleSend}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Send Referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
