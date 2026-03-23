import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MovementStatus } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';
import { SingleDatePicker } from './SingleDatePicker';
import { UkAddressAutocompleteInput } from './UkAddressAutocompleteInput';
import { format, parseISO } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboardStore';
import {
  DEFAULT_APPOINTMENT_TIME,
  normalizeAppointmentTimeForInput,
} from '@/lib/appointmentDateTime';
import { notifyError } from '@/lib/notify';

export interface AddPropertyFormData {
  address: string;
  description: string;
  salesOrLettings: string;
  teamMember: string;
  branch: string;
  acquisitionChannel: string;
  motivatedSeller: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  price: string;
  agencyPeriod: string;
  agencyTerms: string;
  lettingType: string;
  typeOfFee: string;
  feePercentage: string;
  feeAmount: string;
  setupFee: string;
  monthlyManagedFee: string;
  monthlyManagedFeeType: string;
  letOnlyFee: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface StaffOption {
  id: string;
  name: string;
  role?: string;
  branch?: string;
  branch_id?: string | null;
}

const acquisitionChannelOptions = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'signboard', label: 'Signboard' },
  { value: 'website', label: 'Website' },
  { value: 'rightmove', label: 'Rightmove' },
  { value: 'zoopla', label: 'Zoopla' },
  { value: 'social', label: 'Social Media' },
] as const;

const getAcquisitionChannelLabel = (value: string) =>
  acquisitionChannelOptions.find((option) => option.value === value)?.label ?? value;

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStatus: MovementStatus | null;
  prefilledAddress?: string;
  prefilledTeamMember?: string;
  prefilledDate?: string;
  prefilledTime?: string;
  defaultAcquisitionChannel?: string;
  lockAcquisitionChannel?: boolean;
  onSave?: (data?: AddPropertyFormData) => void;
  // Optional: pass real branches from Supabase so branch select shows live data
  branches?: BranchOption[];
  branchesLoading?: boolean;
  // Optional: preselect and lock a specific branch (e.g. branch manager)
  defaultBranchId?: string;
  lockBranch?: boolean;
  // Optional: pass staff members for team member dropdown
  staffMembers?: StaffOption[];
  staffLoading?: boolean;
}

export function AddPropertyDialog({ 
  open, 
  onOpenChange, 
  preselectedStatus, 
  prefilledAddress, 
  prefilledTeamMember,
  prefilledDate,
  prefilledTime,
  defaultAcquisitionChannel,
  lockAcquisitionChannel,
  onSave,
  branches,
  branchesLoading,
  defaultBranchId,
  lockBranch,
  staffMembers: staffMembersProp,
  staffLoading,
}: AddPropertyDialogProps) {
  const isValuationForm = preselectedStatus === 'valuation';
  const { staffMembers: staffMembersFromStore } = useDashboardStore();
  const normalizedPrefilledTime = useMemo(
    () => (prefilledTime ? normalizeAppointmentTimeForInput(prefilledTime) : ''),
    [prefilledTime]
  );
  
  // Use prop staff members if provided, otherwise fall back to store
  const staffMembers = staffMembersProp ?? staffMembersFromStore;
  
  const [formData, setFormData] = useState<AddPropertyFormData>({
    address: prefilledAddress || '',
    description: '',
    salesOrLettings: 'sales',
    teamMember: prefilledTeamMember || '',
    branch: '',
    acquisitionChannel: defaultAcquisitionChannel || '',
    motivatedSeller: '',
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    appointmentDate: prefilledDate || '',
    appointmentTime:
      normalizedPrefilledTime || (isValuationForm ? DEFAULT_APPOINTMENT_TIME : ''),
    // Additional fields for non-valuation forms
    price: '',
    agencyPeriod: '',
    agencyTerms: '',
    lettingType: '',
    typeOfFee: '',
    feePercentage: '',
    feeAmount: '',
    setupFee: '',
    monthlyManagedFee: '',
    monthlyManagedFeeType: 'fixed',
    letOnlyFee: '',
  });

  const selectedBranchName = branches?.find((b) => b.id === formData.branch)?.name;
  const acquisitionChannelDisplayValue = getAcquisitionChannelLabel(
    formData.acquisitionChannel || defaultAcquisitionChannel || ''
  );
  const teamMemberOptions = useMemo(() => {
    if (!staffMembers || staffMembers.length === 0) return [];
    if (!formData.branch) return staffMembers;
    // Filter by branch_id if available, otherwise by branch name
    const scoped = staffMembers.filter((m) => {
      if ('branch_id' in m && m.branch_id) {
        return m.branch_id === formData.branch;
      }
      return m.branch === selectedBranchName;
    });
    return scoped.length > 0 ? scoped : staffMembers;
  }, [staffMembers, formData.branch, selectedBranchName]);

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        address: prefilledAddress || prev.address,
        teamMember: prefilledTeamMember || prev.teamMember,
        acquisitionChannel: defaultAcquisitionChannel || prev.acquisitionChannel,
        appointmentDate: prefilledDate || prev.appointmentDate,
        appointmentTime:
          normalizedPrefilledTime ||
          prev.appointmentTime ||
          (isValuationForm ? DEFAULT_APPOINTMENT_TIME : '')
      }));
    } else if (!open) {
      setFormData({
        address: '',
        description: '',
        salesOrLettings: 'sales',
        teamMember: prefilledTeamMember || '',
        branch: '',
        acquisitionChannel: defaultAcquisitionChannel || '',
        motivatedSeller: '',
        vendorName: '',
        vendorEmail: '',
        vendorPhone: '',
        appointmentDate: '',
        appointmentTime: isValuationForm ? DEFAULT_APPOINTMENT_TIME : '',
        price: '',
        agencyPeriod: '',
        agencyTerms: '',
        lettingType: '',
        typeOfFee: '',
        feePercentage: '',
        feeAmount: '',
        setupFee: '',
        monthlyManagedFee: '',
        monthlyManagedFeeType: 'fixed',
        letOnlyFee: '',
      });
    }
  }, [
    open,
    prefilledAddress,
    prefilledTeamMember,
    prefilledDate,
    normalizedPrefilledTime,
    defaultAcquisitionChannel,
    isValuationForm,
  ]);

  useEffect(() => {
    if (!open) return;
    setFormData(prev => {
      let nextBranch = prev.branch;
      if (defaultBranchId) {
        nextBranch = defaultBranchId;
      } else if (!prev.branch && branches && branches.length === 1) {
        nextBranch = branches[0].id;
      }
      if (nextBranch === prev.branch) return prev;
      return { ...prev, branch: nextBranch };
    });
  }, [open, defaultBranchId, branches]);

  const handleAdd = () => {
    const resolvedAddress = formData.address.trim();

    const missingFields: string[] = [];
    if (!resolvedAddress) missingFields.push('Address');
    if (!isValuationForm && !formData.teamMember) missingFields.push('Team Member');
    if (!isValuationForm && !formData.branch) missingFields.push('Branch');

    if (missingFields.length > 0) {
      notifyError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }
    const basePayload = {
      ...formData,
      address: resolvedAddress,
    };
    const payload = isValuationForm
      ? {
          ...basePayload,
          appointmentTime: normalizeAppointmentTimeForInput(
            formData.appointmentTime || normalizedPrefilledTime || DEFAULT_APPOINTMENT_TIME
          ),
        }
      : basePayload;
    console.log('Form submitted:', payload);
    if (onSave) {
      onSave(payload);
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[750px] bg-card text-card-foreground max-h-[95vh] overflow-y-auto p-4 sm:p-6" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>Add new property</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sales or Lettings Toggle */}
          <div className="space-y-3">
            <Label className="text-foreground">Property Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, salesOrLettings: 'sales' })}
                className={cn(
                  "px-5 py-2.5 text-sm rounded-xl border font-medium transition-all",
                  formData.salesOrLettings === 'sales'
                    ? "border-primary/20 bg-primary/5 text-primary shadow-none"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, salesOrLettings: 'lettings' })}
                className={cn(
                  "px-5 py-2.5 text-sm rounded-xl border font-medium transition-all",
                  formData.salesOrLettings === 'lettings'
                    ? "border-primary/20 bg-primary/5 text-primary shadow-none"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Lettings
              </button>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-foreground">
              Address<span className="text-destructive">*</span>
            </Label>
            <UkAddressAutocompleteInput
              id="address"
              value={formData.address}
              onValueChange={(address) => setFormData({ ...formData, address })}
              onAddressSelect={(details) => {
                if (!details) {
                  return;
                }
                setFormData((prev) => ({
                  ...prev,
                  address: details.address || prev.address,
                }));
              }}
            />
            {/* <p className="text-xs text-muted-foreground">
              Search any UK address or postcode. Suggestions are not limited to addresses already in Grip.
            </p> */}
          </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="e.g. 2 Bedroom Apartment"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background text-foreground"
              />
          </div>
        </div>

          {isValuationForm ? (
            <>
              <div className="space-y-2">
                <Label className="text-foreground">Status</Label>
                <div className="px-4 py-2 rounded-md bg-pink-100 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800">
                  <span className="text-sm font-medium text-pink-700 dark:text-pink-400">Valuation</span>
                </div>
              </div>

              {/* Vendor Details Section */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-foreground">Vendor Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor-name" className="text-foreground">
                      Vendor Name
                    </Label>
                    <Input
                      id="vendor-name"
                      type="text"
                      placeholder="John Smith"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-email" className="text-foreground">
                      Vendor Email
                    </Label>
                    <Input
                      id="vendor-email"
                      type="email"
                      placeholder="vendor@email.com"
                      value={formData.vendorEmail}
                      onChange={(e) => setFormData({ ...formData, vendorEmail: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-phone" className="text-foreground">
                      Vendor Phone
                    </Label>
                    <Input
                      id="vendor-phone"
                      type="tel"
                      placeholder="07700 900123"
                      value={formData.vendorPhone}
                      onChange={(e) => setFormData({ ...formData, vendorPhone: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Diary Appointment Section */}
              <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold text-foreground">Add to Diary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-date" className="text-foreground">
                      Appointment Date
                    </Label>
                    <SingleDatePicker
                      date={formData.appointmentDate ? parseISO(formData.appointmentDate) : undefined}
                      onSelect={(date) => setFormData({ 
                        ...formData, 
                        appointmentDate: date ? format(date, 'yyyy-MM-dd') : '' 
                      })}
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointment-time" className="text-foreground">
                      Appointment Time
                    </Label>
                    <Input
                      id="appointment-time"
                      type="time"
                      step={300}
                      value={formData.appointmentTime}
                      onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground">
                Status<span className="text-destructive">*</span>
              </Label>
              <div className="px-4 py-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">On Books</span>
              </div>
            </div>
          )}

          {(isValuationForm || formData.salesOrLettings === 'sales') && (
            <div className="space-y-2">
              <Label htmlFor="motivated-seller" className="text-foreground">
                Motivated Seller
              </Label>
              <Select
                value={formData.motivatedSeller || ''}
                onValueChange={(value) => setFormData({ ...formData, motivatedSeller: value })}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select motivation level" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="red">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span>Red - Low Motivation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span>Yellow - Medium Motivation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="green">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span>Green - High Motivation</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-member" className="text-foreground">
                Team Member
                {!isValuationForm ? <span className="text-destructive">*</span> : null}
              </Label>
              <Select
                value={formData.teamMember}
                onValueChange={(value) => setFormData({ ...formData, teamMember: value })}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder={teamMemberOptions.length > 0 ? 'Select' : 'No team members available'} />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {teamMemberOptions.length > 0 ? (
                    teamMemberOptions.map((member) => (
                      <SelectItem key={member.id} value={member.name}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.role ? (
                            <span className="text-xs text-muted-foreground">({member.role})</span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No team members available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch" className="text-foreground">
                Branch
                {!isValuationForm ? <span className="text-destructive">*</span> : null}
              </Label>
              <Select
                value={formData.branch}
                onValueChange={(value) => setFormData({ ...formData, branch: value })}
                disabled={!!branchesLoading || !!lockBranch || (branches && branches.length === 0)}
              >
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue
                    placeholder={
                      branchesLoading
                        ? 'Loading branches...'
                        : branches && branches.length > 0
                        ? 'Select'
                        : 'No branches available'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {branches && branches.length > 0 ? (
                    branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisition-channel" className="text-foreground">
                Acquisition Channel
              </Label>
              {lockAcquisitionChannel ? (
                <Input
                  id="acquisition-channel"
                  value={acquisitionChannelDisplayValue}
                  readOnly
                  aria-readonly="true"
                  className="bg-muted text-foreground border-border"
                />
              ) : (
                <Select
                  value={formData.acquisitionChannel}
                  onValueChange={(value) => setFormData({ ...formData, acquisitionChannel: value })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    {acquisitionChannelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {lockAcquisitionChannel ? (
                <p className="text-xs text-muted-foreground">
                  Acquisition channel is set automatically for this prospect.
                </p>
              ) : null}
            </div>
          </div>

          {/* Additional fields for On Books (non-valuation) */}
          {!isValuationForm && (
            <>
              {formData.salesOrLettings === 'sales' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-foreground">
                        Price<span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="text"
                        placeholder="£200,000.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="bg-background text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agency-period" className="text-foreground">
                        Agency Period
                      </Label>
                      <Select
                        value={formData.agencyPeriod}
                        onValueChange={(value) => setFormData({ ...formData, agencyPeriod: value })}
                      >
                        <SelectTrigger className="bg-background text-foreground border-border">
                          <SelectValue placeholder="Weeks" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground">
                          <SelectItem value="4">4 Weeks</SelectItem>
                          <SelectItem value="8">8 Weeks</SelectItem>
                          <SelectItem value="12">12 Weeks</SelectItem>
                          <SelectItem value="16">16 Weeks</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agency-terms" className="text-foreground">
                        Agency Terms
                      </Label>
                      <Select
                        value={formData.agencyTerms}
                        onValueChange={(value) => setFormData({ ...formData, agencyTerms: value })}
                      >
                        <SelectTrigger className="bg-background text-foreground border-border">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground">
                          <SelectItem value="sole">Sole Agency</SelectItem>
                          <SelectItem value="multi">Multi Agency</SelectItem>
                          <SelectItem value="joint">Joint Sole Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                    <h3 className="font-semibold text-foreground">Sales Fee</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fee-type" className="text-foreground">
                          Fee Type<span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.typeOfFee}
                          onValueChange={(value) => setFormData({ ...formData, typeOfFee: value })}
                        >
                          <SelectTrigger className="bg-background text-foreground border-border">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover text-popover-foreground">
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed (£)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fee-value" className="text-foreground">
                          Fee {formData.typeOfFee === 'percentage' ? 'Percentage' : 'Amount'}<span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="fee-value"
                          type="text"
                          placeholder={formData.typeOfFee === 'percentage' ? '1.5' : '£5,000'}
                          value={formData.typeOfFee === 'percentage' ? formData.feePercentage : formData.feeAmount}
                          onChange={(e) => {
                            if (formData.typeOfFee === 'percentage') {
                              setFormData({ ...formData, feePercentage: e.target.value });
                            } else {
                              setFormData({ ...formData, feeAmount: e.target.value });
                            }
                          }}
                          className="bg-background text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly-rent" className="text-foreground">
                        Monthly Rent<span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="monthly-rent"
                        type="text"
                        placeholder="£1,200"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="bg-background text-foreground"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="letting-type" className="text-foreground">
                        Letting Type
                      </Label>
                      <Select
                        value={formData.lettingType}
                        onValueChange={(value) => setFormData({ ...formData, lettingType: value })}
                      >
                        <SelectTrigger className="bg-background text-foreground border-border">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground">
                          <SelectItem value="fully-managed">Fully Managed</SelectItem>
                          <SelectItem value="let-only">Let Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.lettingType === 'let-only' && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="let-only-fee" className="text-foreground">
                            Let Only Fee (£)
                          </Label>
                          <Input
                            id="let-only-fee"
                            type="text"
                            placeholder="£350"
                            value={formData.letOnlyFee}
                            onChange={(e) => setFormData({ ...formData, letOnlyFee: e.target.value })}
                            className="bg-background text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.lettingType === 'fully-managed' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <div className="space-y-2">
                          <Label htmlFor="setup-fee" className="text-foreground">
                            Setup Fee (£)
                          </Label>
                          <Input
                            id="setup-fee"
                            type="text"
                            placeholder="£500"
                            value={formData.setupFee}
                            onChange={(e) => setFormData({ ...formData, setupFee: e.target.value })}
                            className="bg-background text-foreground"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="monthly-managed-fee-type" className="text-foreground">
                            Monthly Managed Fee Type
                          </Label>
                          <Select
                            value={formData.monthlyManagedFeeType}
                            onValueChange={(value) => setFormData({ ...formData, monthlyManagedFeeType: value })}
                          >
                            <SelectTrigger className="bg-background text-foreground border-border">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover text-popover-foreground">
                              <SelectItem value="fixed">Fixed (£)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="monthly-managed-fee" className="text-foreground">
                            Monthly Managed Fee {formData.monthlyManagedFeeType === 'percentage' ? '(%)' : '(£)'}
                          </Label>
                          <Input
                            id="monthly-managed-fee"
                            type="text"
                            placeholder={formData.monthlyManagedFeeType === 'percentage' ? '10%' : '£150'}
                            value={formData.monthlyManagedFee}
                            onChange={(e) => setFormData({ ...formData, monthlyManagedFee: e.target.value })}
                            className="bg-background text-foreground"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                        <h3 className="font-semibold text-foreground">Landlord Fees</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="tenancy-setup" className="text-foreground">
                              Tenancy Setup (£)
                            </Label>
                            <Input
                              id="tenancy-setup"
                              type="text"
                              placeholder="£250"
                              className="bg-background text-foreground"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="tenancy-renewal" className="text-foreground">
                              Tenancy Renewal (£)
                            </Label>
                            <Input
                              id="tenancy-renewal"
                              type="text"
                              placeholder="£150"
                              className="bg-background text-foreground"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="annual-statement" className="text-foreground">
                              Annual Statement (£)
                            </Label>
                            <Input
                              id="annual-statement"
                              type="text"
                              placeholder="£100"
                              className="bg-background text-foreground"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="gas-safety" className="text-foreground">
                              Gas Safety Check (£)
                            </Label>
                            <Input
                              id="gas-safety"
                              type="text"
                              placeholder="£80"
                              className="bg-background text-foreground"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="epc" className="text-foreground">
                              EPC (£)
                            </Label>
                            <Input
                              id="epc"
                              type="text"
                              placeholder="£60"
                              className="bg-background text-foreground"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="eicr" className="text-foreground">
                              EICR (£)
                            </Label>
                            <Input
                              id="eicr"
                              type="text"
                              placeholder="£120"
                              className="bg-background text-foreground"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleAdd}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
