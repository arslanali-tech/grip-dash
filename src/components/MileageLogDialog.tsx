import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CarIcon, MapPinIcon, ArrowRightIcon, ArrowLeftRightIcon, CalculatorIcon, Loader2Icon, MapIcon } from 'lucide-react';

interface MileageLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  onSave: (data: any) => void;
}

export function MileageLogDialog({ open, onOpenChange, event, onSave }: MileageLogDialogProps) {
  const [startLocation, setStartLocation] = useState('Office');
  const [endLocation, setEndLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [isReturnTrip, setIsReturnTrip] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (event && open) {
      const end = event.propertyAddress || event.location || event.title || '';
      setEndLocation(end);
      setStartLocation('Office'); // Default start
      setDistance('');
      setIsReturnTrip(true);

      // Auto calculate on open
      if (end) {
        setIsCalculating(true);
        setTimeout(() => {
          const seed = 'Office'.length + end.length;
          const mockDistance = (seed % 15) + 3.5;
          setDistance(mockDistance.toFixed(1));
          setIsCalculating(false);
        }, 800);
      }
    }
  }, [event, open]);

  const calculateDistance = () => {
    if (!startLocation || !endLocation) return;
    
    setIsCalculating(true);
    // Simulate API calculation delay
    setTimeout(() => {
      // Mock calculation: Generate a realistic distance based on input length to be deterministic
      // In a real app, this would call a Maps API (e.g., Google Maps Distance Matrix)
      const seed = startLocation.length + endLocation.length;
      const mockDistance = (seed % 15) + 3.5; // Randomish distance between 3.5 and 18.5 miles
      setDistance(mockDistance.toFixed(1));
      setIsCalculating(false);
    }, 800);
  };

  const handleSave = () => {
    if (!distance) {
      alert('Please enter the distance.');
      return;
    }

    onSave({
      eventId: event.id,
      startLocation,
      endLocation,
      distance: parseFloat(distance),
      isReturnTrip,
      totalDistance: isReturnTrip ? parseFloat(distance) * 2 : parseFloat(distance),
      date: new Date().toISOString()
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CarIcon className="h-5 w-5 text-primary" />
            Log Mileage
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">From</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9 bg-background" 
                  value={startLocation} 
                  onChange={e => setStartLocation(e.target.value)} 
                  placeholder="Start location"
                />
              </div>
            </div>
            
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-card border border-border rounded-full p-1.5 shadow-sm">
                {isReturnTrip ? (
                  <ArrowLeftRightIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">To</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9 bg-background" 
                  value={endLocation} 
                  onChange={e => setEndLocation(e.target.value)} 
                  placeholder="Destination (Postcode)"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMap(!showMap)}
                className="text-xs h-7 gap-1.5"
              >
                <MapIcon className="h-3 w-3" />
                {showMap ? 'Hide Map' : 'View Map'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={calculateDistance}
                disabled={isCalculating || !startLocation || !endLocation}
                className="text-xs h-7 gap-1.5"
              >
                {isCalculating ? (
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                ) : (
                  <CalculatorIcon className="h-3 w-3" />
                )}
                {isCalculating ? 'Calculating...' : 'Auto Calculate'}
              </Button>
            </div>

            {showMap && (
              <div className="h-40 w-full bg-muted/30 rounded-md border border-border relative overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="absolute inset-0 opacity-30">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid-map" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid-map)" className="text-muted-foreground" />
                        <path d="M 40 80 Q 150 20 250 80 T 380 50" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
                        <circle cx="40" cy="80" r="4" className="fill-primary" />
                        <circle cx="380" cy="50" r="4" className="fill-red-500" />
                    </svg>
                </div>
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-muted-foreground border border-border shadow-sm">
                    Route Preview
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Distance (Miles)</Label>
              <Input 
                type="number" 
                value={distance} 
                onChange={e => setDistance(e.target.value)} 
                placeholder="0.0" 
                className="bg-background h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="invisible">Return Trip</Label>
              <div className="flex items-center justify-between gap-2 border border-border rounded-md px-3 h-9 bg-muted/20">
                <Label htmlFor="return-trip" className="cursor-pointer text-sm m-0">Return Trip?</Label>
                <Switch id="return-trip" checked={isReturnTrip} onCheckedChange={setIsReturnTrip} />
              </div>
            </div>
          </div>

          {distance && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Total Distance</span>
              <span className="text-xl font-bold text-primary">
                {isReturnTrip ? (parseFloat(distance) * 2).toFixed(1) : parseFloat(distance).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">miles</span>
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Save Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
