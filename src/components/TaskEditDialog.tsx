import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleDatePicker } from './SingleDatePicker';
import { format, parse, isValid } from 'date-fns';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  rawDate: Date;
  time: string;
  tag: string;
  completed: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskItem | null;
  onSave: (updatedTask: TaskItem) => void;
  onDelete: (taskId: string) => void;
}

export function TaskEditDialog({ open, onOpenChange, task, onSave, onDelete }: TaskEditDialogProps) {
  const [formData, setFormData] = useState<Partial<TaskItem>>({});
  const [timeInput, setTimeInput] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
      // Try to convert "2:00 PM" to "14:00" for input type="time"
      try {
        const parsedTime = parse(task.time, 'h:mm a', new Date());
        if (isValid(parsedTime)) {
          setTimeInput(format(parsedTime, 'HH:mm'));
        } else {
          setTimeInput(task.time); // Fallback
        }
      } catch {
        setTimeInput(task.time);
      }
    }
  }, [task]);

  const handleSave = () => {
    if (formData.title && task) {
      // Convert time back to display format if it was changed via time input
      let displayTime = formData.time;
      if (timeInput) {
         const parsedTime = parse(timeInput, 'HH:mm', new Date());
         if (isValid(parsedTime)) {
           displayTime = format(parsedTime, 'h:mm a');
         } else {
           displayTime = timeInput;
         }
      }

      onSave({ ...task, ...formData, time: displayTime || '' } as TaskItem);
      onOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input 
              value={formData.title || ''} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={formData.description || ''} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <SingleDatePicker
                date={formData.rawDate}
                onSelect={(date) => {
                    if (date) {
                        const dateStr = format(date, 'EEE, MMM d');
                        setFormData({ ...formData, rawDate: date, date: dateStr });
                    }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input 
                type="time"
                value={timeInput} 
                onChange={(e) => setTimeInput(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recurrence</Label>
            <Select 
              value={formData.recurrence || 'none'} 
              onValueChange={(value: any) => setFormData({ ...formData, recurrence: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tag</Label>
             <Input 
              value={formData.tag || ''} 
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              className="bg-background"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={() => { onDelete(task.id); onOpenChange(false); }}>Delete</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
