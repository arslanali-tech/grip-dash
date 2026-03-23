import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    type: 'event' | 'task' | 'out-of-office' | 'appointment';
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    guests?: string;
    description?: string;
    category: string;
  }) => void;
  prefilledDate?: Date;
  prefilledTime?: string;
  prefilledCategory?: string;
  categories?: Array<{ id: string; label: string }>;
}

export function CreateEventDialog({ 
  open, 
  onOpenChange, 
  onSave,
  prefilledDate,
  prefilledTime,
  prefilledCategory,
  categories,
}: CreateEventDialogProps) {
  const [eventType, setEventType] = useState<'event' | 'task' | 'out-of-office' | 'appointment'>('event');
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    guests: '',
    description: '',
    category: 'meeting',
  });

  const fallbackCategories = [
    { id: 'viewing', label: 'Viewing' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'photo-measure', label: 'Photo & Measure' },
    { id: 'meeting', label: 'Meeting' },
    { id: 'holiday', label: 'Holiday' },
    { id: 'conference', label: 'Conference' },
  ];

  const availableCategories = useMemo(() => {
    const base = Array.isArray(categories) && categories.length > 0 ? categories : fallbackCategories;
    if (!prefilledCategory) return base;
    if (base.some((cat) => cat.id === prefilledCategory)) return base;
    return [{ id: prefilledCategory, label: prefilledCategory }, ...base];
  }, [categories, prefilledCategory]);

  useEffect(() => {
    if (open) {
      const today = prefilledDate || new Date();
      const defaultTime = prefilledTime || '09:00';
      const endTime = prefilledTime 
        ? `${parseInt(prefilledTime.split(':')[0]) + 1}:${prefilledTime.split(':')[1]}`
        : '10:00';
      const categoryValue =
        prefilledCategory && availableCategories.some((cat) => cat.id === prefilledCategory)
          ? prefilledCategory
          : 'meeting';

      setFormData({
        title: '',
        date: format(today, 'yyyy-MM-dd'),
        startTime: defaultTime,
        endTime: endTime,
        location: '',
        guests: '',
        description: '',
        category: categoryValue,
      });
      setEventType('event');
    }
  }, [open, prefilledDate, prefilledTime, prefilledCategory, availableCategories]);

  const handleSave = () => {
    if (!formData.title || !formData.date || !formData.startTime) {
      alert('Please fill in title, date, and start time');
      return;
    }

    onSave({
      ...formData,
      type: eventType,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl font-semibold">Create Event</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Event Type Tabs */}
          <Tabs value={eventType} onValueChange={(value: any) => setEventType(value)}>
            <TabsList className="bg-transparent text-muted-foreground flex w-full h-auto gap-2 p-0">
              <TabsTrigger 
                value="event" 
                className="flex-1 px-4 py-2 text-sm rounded-md border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm hover:bg-accent hover:text-foreground transition-all font-medium text-muted-foreground"
              >
                Event
              </TabsTrigger>
              <TabsTrigger 
                value="task" 
                className="flex-1 px-4 py-2 text-sm rounded-md border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm hover:bg-accent hover:text-foreground transition-all font-medium text-muted-foreground"
              >
                Task
              </TabsTrigger>
              <TabsTrigger 
                value="out-of-office" 
                className="flex-1 px-4 py-2 text-sm rounded-md border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm hover:bg-accent hover:text-foreground transition-all font-medium text-muted-foreground"
              >
                Out of office
              </TabsTrigger>
              <TabsTrigger 
                value="appointment" 
                className="flex-1 px-4 py-2 text-sm rounded-md border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm hover:bg-accent hover:text-foreground transition-all font-medium text-muted-foreground relative"
              >
                Appointment
                <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">New</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-date" className="text-foreground text-xs">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background text-foreground border-border h-9 text-xs",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                      {formData.date ? format(new Date(formData.date), 'EEE do MMM') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover text-popover-foreground" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-foreground text-xs">
                  Start
                </Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) => {
                    setFormData({ ...formData, startTime: value });
                    // Auto-update end time to 1 hour later if not set
                    if (!formData.endTime) {
                      const [hours, minutes] = value.split(':').map(Number);
                      const endHours = hours + 1;
                      setFormData({ 
                        ...formData, 
                        startTime: value,
                        endTime: `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                      });
                    }
                  }}
                >
                  <SelectTrigger className="bg-background text-foreground border-border h-9 text-xs">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground max-h-[300px]">
                    {Array.from({ length: 96 }, (_, i) => {
                      const hours = Math.floor(i / 4);
                      const minutes = (i % 4) * 15;
                      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      return (
                        <SelectItem key={timeString} value={timeString}>
                          {timeString}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-foreground text-xs">
                  End
                </Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border h-9 text-xs">
                    <SelectValue placeholder="Time">
                      {formData.endTime && formData.startTime && (() => {
                        const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
                        const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
                        const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
                        const hours = Math.floor(durationMinutes / 60);
                        const mins = durationMinutes % 60;
                        const durationText = hours > 0 
                          ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`
                          : `${mins}m`;
                        return `${formData.endTime} (${durationText.trim()})`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground max-h-[300px]">
                    {Array.from({ length: 96 }, (_, i) => {
                      const hours = Math.floor(i / 4);
                      const minutes = (i % 4) * 15;
                      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      
                      // Calculate duration if start time is set
                      let durationText = '';
                      if (formData.startTime) {
                        const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
                        const durationMinutes = (hours * 60 + minutes) - (startHours * 60 + startMinutes);
                        if (durationMinutes > 0) {
                          const durationHours = Math.floor(durationMinutes / 60);
                          const durationMins = durationMinutes % 60;
                          durationText = durationHours > 0 
                            ? ` (${durationHours}h ${durationMins > 0 ? `${durationMins}m` : ''})`
                            : ` (${durationMins}m)`;
                        }
                      }
                      
                      return (
                        <SelectItem key={timeString} value={timeString}>
                          {timeString}{durationText}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Time zone</span>
              <span className="text-xs text-muted-foreground">•</span>
              <Select defaultValue="no-repeat">
                <SelectTrigger className="h-7 w-auto border-0 bg-transparent text-xs text-muted-foreground hover:bg-accent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="no-repeat">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">
                    Weekly on {formData.date ? format(new Date(formData.date), 'EEEE') : 'selected day'}
                  </SelectItem>
                  <SelectItem value="monthly">
                    Monthly on the {formData.date ? format(new Date(formData.date), 'do') : ''} {formData.date ? format(new Date(formData.date), 'EEEE') : ''}
                  </SelectItem>
                  <SelectItem value="annually">
                    Annually on {formData.date ? format(new Date(formData.date), 'MMMM d') : 'selected date'}
                  </SelectItem>
                  <SelectItem value="weekdays">Every weekday (Monday to Friday)</SelectItem>
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground text-sm font-medium">Event Title</Label>
            <Input
              id="title"
              placeholder="Add title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-background text-foreground border-border h-9"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-foreground text-sm font-medium">Event Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="bg-background text-foreground border-border h-9">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground rounded-lg">
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <Label htmlFor="guests" className="text-foreground flex items-center gap-2 text-sm font-medium">
              <UsersIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Add guests
            </Label>
            <Input
              id="guests"
              placeholder="Enter email addresses"
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
              className="bg-background text-foreground border-border h-9"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground flex items-center gap-2 text-sm font-medium">
              <MapPinIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Add location
            </Label>
            <Input
              id="location"
              placeholder="Enter location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="bg-background text-foreground border-border h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground text-sm font-medium">
              Add description
            </Label>
            <Textarea
              id="description"
              placeholder="Add description or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-background text-foreground min-h-[100px] border-border"
            />
          </div>

          {/* Additional Options */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Tom Davis • Busy • Default visibility • Notify 10 minutes before
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
