import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileTextIcon, LayoutTemplateIcon } from 'lucide-react';

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'sales' | 'financial' | 'performance' | 'custom';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (report: any) => void;
  template?: ReportTemplate | null;
}

export function CreateReportDialog({ open, onOpenChange, onSave, template }: CreateReportDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('sales');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('weekly');

  // Pre-fill form when template is provided
  useEffect(() => {
    if (template && open) {
      setName(template.name);
      setType(template.type);
      setDescription(template.description);
      setFrequency(template.frequency);
    } else if (!open) {
      // Reset when dialog closes
      setName('');
      setType('sales');
      setDescription('');
      setFrequency('weekly');
    }
  }, [template, open]);

  const handleSave = () => {
    if (!name) {
      alert('Please enter a report name');
      return;
    }

    const newReport = {
      id: `new-${Date.now()}`,
      name,
      type,
      description,
      lastGenerated: new Date().toISOString(),
      frequency,
      recipients: [],
      status: 'ready'
    };
    onSave(newReport);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            {template ? (
              <LayoutTemplateIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            ) : (
              <FileTextIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            )}
            {template ? `Create from Template: ${template.name}` : 'Create New Report'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-name" className="text-foreground">Report Name</Label>
            <Input 
              id="report-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Weekly Sales Summary"
              className="bg-background text-foreground"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="report-type" className="text-foreground">Report Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="report-type" className="bg-background text-foreground border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="sales">Sales Performance</SelectItem>
                <SelectItem value="financial">Financial Summary</SelectItem>
                <SelectItem value="performance">Staff Performance</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-foreground">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="frequency" className="bg-background text-foreground border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Describe the report content..."
              className="bg-background text-foreground min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Create Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
