import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, FileTextIcon } from 'lucide-react';
import { SingleDatePicker } from './SingleDatePicker';
import { format, parseISO } from 'date-fns';

export interface AddHealthSafetyItemData {
  title: string;
  category: 'risk-assessment' | 'incident-report' | 'training' | 'inspection' | 'policy';
  status: 'compliant' | 'pending' | 'overdue';
  dueDate?: string;
  assignedTo: string;
  branch: string;
  details?: any;
}

interface AddHealthSafetyItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AddHealthSafetyItemData) => void;
  initialData?: Partial<AddHealthSafetyItemData>;
  title?: string;
}

export function AddHealthSafetyItemDialog({ open, onOpenChange, onSave, initialData, title }: AddHealthSafetyItemDialogProps) {
  const [formData, setFormData] = useState<AddHealthSafetyItemData>({
    title: initialData?.title ?? '',
    category: (initialData?.category as any) ?? 'risk-assessment',
    status: (initialData?.status as any) ?? 'pending',
    dueDate: initialData?.dueDate ?? '',
    assignedTo: initialData?.assignedTo ?? '',
    branch: initialData?.branch ?? '',
    details: initialData?.details ?? '',
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    onSave(formData);
    setFormData({ title: '', category: 'risk-assessment', status: 'pending', dueDate: '', assignedTo: '', branch: '', details: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            {title ?? 'Add Health & Safety Item'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Create a new policy, risk assessment, training, or inspection item.</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label className="text-foreground">Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="risk-assessment">Risk Assessment</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="incident-report">Incident Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                <SelectTrigger className="bg-background text-foreground border-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Due Date</Label>
              <SingleDatePicker
                date={formData.dueDate ? parseISO(formData.dueDate) : undefined}
                onSelect={(date) => setFormData({ ...formData, dueDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                placeholder="Select date (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Assigned To</Label>
              <Input value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Branch</Label>
              <Input value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-foreground">Details/Notes</Label>
              <Textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} className="min-h-[80px]" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Save Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
