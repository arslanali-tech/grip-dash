import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XIcon } from 'lucide-react';
import { useDashboardStore, ProspectingStatus } from '@/stores/dashboardStore';
import { createProspect, type ProspectInput } from '@/lib/dashboardApi';
import { encodeProspectNotes } from '@/lib/prospectNotes';
import { useAuthStore } from '@/stores/authStore';
import { UkAddressAutocompleteInput } from './UkAddressAutocompleteInput';

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not read file data.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

export function AddProspectDialog({ open, onOpenChange }: AddProspectDialogProps) {
  const { agencyId, clientId, loadProspects } = useDashboardStore();
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    propertyAddress: '',
    ownerName: '',
    rightmoveLink: '',
    ownerPhone: '',
    ownerEmail: '',
    askingPrice: '',
    timeOnMarket: '',
    salesOrLettings: '',
    hotCold: '',
    stage: '' as ProspectingStatus,
    notes: '',
    currentAgent: '',
    propertyPhotoDataUrl: '',
    propertyPhotoName: '',
  });

  const prospectingStatuses: { value: ProspectingStatus; label: string }[] = [
    { value: 'canvassed', label: 'Canvassed' },
    { value: 'not-available', label: 'Not Available' },
    { value: 'opportunities', label: 'Opportunities' },
    { value: 'potential-seller', label: 'Potential Seller' },
    { value: 'sold-oa', label: 'Sold OA' },
    { value: 'valuation', label: 'Valuation' },
  ];

  const handleCreate = async () => {
    if (isSaving) return;

    // Basic validation
    if (!formData.propertyAddress || !formData.salesOrLettings || !formData.stage) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!agencyId) {
      alert('No agency selected for this user.');
      return;
    }

    setIsSaving(true);
    const createdAtIso = new Date().toISOString();
    const changedBy =
      (user?.user_metadata as any)?.name ??
      (user?.app_metadata as any)?.name ??
      user?.email ??
      formData.ownerName ??
      'System';

    const input: ProspectInput = {
      date: new Date().toISOString().split('T')[0],
      stage: formData.stage,
      address: formData.propertyAddress,
      prospector: formData.ownerName || 'N/A',
      notes: encodeProspectNotes(
        formData.notes,
        formData.currentAgent,
        formData.propertyPhotoDataUrl ? [formData.propertyPhotoDataUrl] : undefined,
        undefined,
        [{ status: formData.stage, changedBy, changedAt: createdAtIso }]
      ),
      price_est: parseFloat(formData.askingPrice.replace(/[^0-9.-]+/g, '')) || 0,
      // branch_id is optional; allow unassigned for now.
      type: formData.salesOrLettings === 'sales' ? 'for-sale' : 'to-let',
      hot_cold:
        formData.hotCold === 'hot'
          ? 'hot'
          : formData.hotCold === 'cold'
            ? 'cold'
            : 'incomplete',
      movement_booked: false,
    };


    let created: any = null;
    let errorMsg = '';
    try {
      created = await createProspect(agencyId, input, clientId ?? undefined);
    } catch (err) {
      errorMsg = (err && (err.message || err.toString())) || 'Unknown error';
    }
    if (!created) {
      let extra = errorMsg ? `\nError: ${errorMsg}` : '';
      alert('Failed to create prospect in Supabase.' + extra);
      // Try to log the error from the API if available
      if (window && window.console) {
        window.console.error('Failed to create prospect', { input, errorMsg, created });
      }
      setIsSaving(false);
      return;
    }

    await loadProspects(agencyId);

    // Reset form and close dialog
    setFormData({
      propertyAddress: '',
      ownerName: '',
      rightmoveLink: '',
      ownerPhone: '',
      ownerEmail: '',
      askingPrice: '',
      timeOnMarket: '',
      salesOrLettings: '',
      hotCold: '',
      stage: '' as ProspectingStatus,
      notes: '',
      currentAgent: '',
      propertyPhotoDataUrl: '',
      propertyPhotoName: '',
    });

    setIsSaving(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setFormData({
      propertyAddress: '', ownerName: '', rightmoveLink: '', ownerPhone: '', ownerEmail: '',
      askingPrice: '', timeOnMarket: '', salesOrLettings: '', hotCold: '', stage: '' as ProspectingStatus, notes: '',
      currentAgent: '',
      propertyPhotoDataUrl: '',
      propertyPhotoName: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Add new property</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Address - Full Width */}
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

          {/* Owner Name and Current Agent - Two Columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-name" className="text-foreground">
                Owner Name
              </Label>
              <Input
                id="owner-name"
                type="text"
                placeholder="John Doe"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-agent" className="text-foreground">
                Current Agent
              </Label>
              <Input
                id="current-agent"
                type="text"
                placeholder="John Smith - ABC Estate Agents"
                value={formData.currentAgent || ''}
                onChange={(e) => setFormData({ ...formData, currentAgent: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>
          </div>

          {/* Contact Details - Two Columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-phone" className="text-foreground">
                Owner Phone
              </Label>
              <Input
                id="owner-phone"
                type="tel"
                placeholder="07700 900123"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-email" className="text-foreground">
                Owner Email
              </Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="owner@email.com"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>
          </div>

          {/* Property Link - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="property-link" className="text-foreground">
              Property Link
            </Label>
            <Input
              id="property-link"
              type="url"
              placeholder="https://www.rightmove.co.uk/properties/123456"
              value={formData.rightmoveLink}
              onChange={(e) => setFormData({ ...formData, rightmoveLink: e.target.value })}
              className="bg-background text-foreground"
            />
          </div>

          {/* Property Photo - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="property-photo" className="text-foreground">
              Property Photo
            </Label>
            <Input
              id="property-photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const inputEl = e.currentTarget;
                const file = e.target.files?.[0];
                if (!file) {
                  setFormData((prev) => ({
                    ...prev,
                    propertyPhotoDataUrl: '',
                    propertyPhotoName: '',
                  }));
                  return;
                }

                if (!file.type.startsWith('image/')) {
                  alert('Please choose an image file.');
                  inputEl.value = '';
                  return;
                }

                if (file.size > MAX_PHOTO_BYTES) {
                  alert('Photo must be 5MB or smaller.');
                  inputEl.value = '';
                  return;
                }

                void (async () => {
                  try {
                    const dataUrl = await readFileAsDataUrl(file);
                    setFormData((prev) => ({
                      ...prev,
                      propertyPhotoDataUrl: dataUrl,
                      propertyPhotoName: file.name,
                    }));
                  } catch (error) {
                    console.error('Failed to read photo file', error);
                    alert('Failed to read selected photo.');
                    inputEl.value = '';
                  }
                })();
              }}
              className="bg-background text-foreground"
            />
            {formData.propertyPhotoDataUrl ? (
              <div className="rounded-md border border-border p-2">
                <img
                  src={formData.propertyPhotoDataUrl}
                  alt={formData.propertyPhotoName || 'Selected property photo'}
                  className="h-24 w-24 rounded object-cover"
                />
                {formData.propertyPhotoName ? (
                  <p className="mt-1 text-xs text-muted-foreground">{formData.propertyPhotoName}</p>
                ) : null}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Supports JPG, PNG (max 5MB)</p>
          </div>

          {/* Price, Time on Market, Hot/Cold - Three Columns */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asking-price" className="text-foreground">
                Asking Price
              </Label>
              <Input
                id="asking-price"
                type="text"
                placeholder="£200,000"
                value={formData.askingPrice}
                onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-on-market" className="text-foreground">
                Time on Market (Weeks)
              </Label>
              <Input
                id="time-on-market"
                type="text"
                placeholder="4"
                value={formData.timeOnMarket}
                onChange={(e) => setFormData({ ...formData, timeOnMarket: e.target.value })}
                className="bg-background text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hot-cold" className="text-foreground">
                Hot/Cold
              </Label>
              <Select
                value={formData.hotCold}
                onValueChange={(value) => setFormData({ ...formData, hotCold: value })}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sales/Lettings and Stage - Two Columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sales-lettings" className="text-foreground">
                Sales or Lettings<span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.salesOrLettings}
                onValueChange={(value) => setFormData({ ...formData, salesOrLettings: value })}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="lettings">Lettings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage" className="text-foreground">
                Stage<span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value as ProspectingStatus })}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {prospectingStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this prospect..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-background text-foreground min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
