import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangleIcon, UserIcon, CalendarIcon, ClockIcon } from 'lucide-react';
import { SingleDatePicker } from './SingleDatePicker';
import { format, parseISO } from 'date-fns';

interface ReportInjuryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    injuredPerson: string;
    incidentDate: string;
    incidentTime: string;
    location: string;
    injuryType: string;
    severity: string;
    description: string;
    witnessName: string;
    witnessContact: string;
    firstAidGiven: string;
    medicalAttention: string;
    reportedBy: string;
    immediateActions: string;
  }) => void;
}

export function ReportInjuryDialog({ open, onOpenChange, onSave }: ReportInjuryDialogProps) {
  const [formData, setFormData] = useState({
    injuredPerson: '',
    incidentDate: '',
    incidentTime: '',
    location: '',
    injuryType: '',
    severity: '',
    description: '',
    witnessName: '',
    witnessContact: '',
    firstAidGiven: '',
    medicalAttention: '',
    reportedBy: '',
    immediateActions: '',
  });

  const handleSave = () => {
    if (!formData.injuredPerson || !formData.incidentDate || !formData.description) {
      alert('Please fill in all required fields: Injured Person, Date, and Description');
      return;
    }

    onSave(formData);
    
    // Reset form
    setFormData({
      injuredPerson: '',
      incidentDate: '',
      incidentTime: '',
      location: '',
      injuryType: '',
      severity: '',
      description: '',
      witnessName: '',
      witnessContact: '',
      firstAidGiven: '',
      medicalAttention: '',
      reportedBy: '',
      immediateActions: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-red-600" strokeWidth={1.5} />
            Report Injury/Incident
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete this form to report any workplace injury or incident
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Incident Information */}
          <div className="space-y-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-red-600" strokeWidth={1.5} />
              Incident Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="injured-person" className="text-foreground">
                  Injured Person<span className="text-destructive">*</span>
                </Label>
                <Input
                  id="injured-person"
                  placeholder="Full name"
                  value={formData.injuredPerson}
                  onChange={(e) => setFormData({ ...formData, injuredPerson: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reported-by" className="text-foreground">
                  Reported By
                </Label>
                <Input
                  id="reported-by"
                  placeholder="Your name"
                  value={formData.reportedBy}
                  onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-date" className="text-foreground">
                  Date of Incident<span className="text-destructive">*</span>
                </Label>
                <SingleDatePicker
                  date={formData.incidentDate ? parseISO(formData.incidentDate) : undefined}
                  onSelect={(date) => setFormData({ 
                    ...formData, 
                    incidentDate: date ? format(date, 'yyyy-MM-dd') : '' 
                  })}
                  placeholder="Select date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-time" className="text-foreground">
                  Time of Incident
                </Label>
                <Input
                  id="incident-time"
                  type="time"
                  value={formData.incidentTime}
                  onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="location" className="text-foreground">
                  Location of Incident
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Main office, Reception area, Property viewing"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Injury Details */}
          <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-foreground">Injury Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="injury-type" className="text-foreground">Type of Injury</Label>
                <Select
                  value={formData.injuryType}
                  onValueChange={(value) => setFormData({ ...formData, injuryType: value })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue placeholder="Select injury type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="cut">Cut/Laceration</SelectItem>
                    <SelectItem value="bruise">Bruise/Contusion</SelectItem>
                    <SelectItem value="sprain">Sprain/Strain</SelectItem>
                    <SelectItem value="burn">Burn</SelectItem>
                    <SelectItem value="fracture">Fracture</SelectItem>
                    <SelectItem value="head">Head Injury</SelectItem>
                    <SelectItem value="back">Back Injury</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Severity</Label>
                <RadioGroup 
                  value={formData.severity} 
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minor" id="minor" />
                      <Label htmlFor="minor" className="cursor-pointer text-green-700">Minor</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="moderate" id="moderate" />
                      <Label htmlFor="moderate" className="cursor-pointer text-yellow-700">Moderate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="serious" id="serious" />
                      <Label htmlFor="serious" className="cursor-pointer text-red-700">Serious</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description of Incident<span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what happened, how the injury occurred, and any contributing factors..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background text-foreground min-h-[100px]"
              />
            </div>
          </div>

          {/* Witness Information */}
          <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-foreground">Witness Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="witness-name" className="text-foreground">Witness Name</Label>
                <Input
                  id="witness-name"
                  placeholder="Full name (if any)"
                  value={formData.witnessName}
                  onChange={(e) => setFormData({ ...formData, witnessName: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="witness-contact" className="text-foreground">Witness Contact</Label>
                <Input
                  id="witness-contact"
                  placeholder="Phone or email"
                  value={formData.witnessContact}
                  onChange={(e) => setFormData({ ...formData, witnessContact: e.target.value })}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Medical Response */}
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-foreground">Medical Response</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">First Aid Given?</Label>
                <RadioGroup 
                  value={formData.firstAidGiven} 
                  onValueChange={(value) => setFormData({ ...formData, firstAidGiven: value })}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="first-aid-yes" />
                      <Label htmlFor="first-aid-yes" className="cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="first-aid-no" />
                      <Label htmlFor="first-aid-no" className="cursor-pointer">No</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Medical Attention Required?</Label>
                <RadioGroup 
                  value={formData.medicalAttention} 
                  onValueChange={(value) => setFormData({ ...formData, medicalAttention: value })}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="medical-none" />
                      <Label htmlFor="medical-none" className="cursor-pointer">None</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gp" id="medical-gp" />
                      <Label htmlFor="medical-gp" className="cursor-pointer">GP Visit</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hospital" id="medical-hospital" />
                      <Label htmlFor="medical-hospital" className="cursor-pointer">Hospital</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ambulance" id="medical-ambulance" />
                      <Label htmlFor="medical-ambulance" className="cursor-pointer">Ambulance</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Immediate Actions */}
          <div className="space-y-2">
            <Label htmlFor="immediate-actions" className="text-foreground">
              Immediate Actions Taken
            </Label>
            <Textarea
              id="immediate-actions"
              placeholder="Describe any immediate actions taken to secure the area, provide assistance, etc..."
              value={formData.immediateActions}
              onChange={(e) => setFormData({ ...formData, immediateActions: e.target.value })}
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
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <AlertTriangleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
