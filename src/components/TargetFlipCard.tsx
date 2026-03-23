import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { gsap } from 'gsap';
import { CheckCircle2Icon, XIcon, SaveIcon, EditIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TargetFlipCardProps {
  title: string;
  subtitle: string;
  currentValue: number;
  goal: number;
  unit?: string; // e.g., "£", "%"
  colorClass: string; // Tailwind class for progress bar and status dot
  onSave: (newGoal: number) => void;
  initialFlipped?: boolean; // New prop to control initial state
}

export function TargetFlipCard({
  title,
  subtitle,
  currentValue,
  goal,
  unit = '',
  colorClass,
  onSave,
  initialFlipped = false, // Default to false
}: TargetFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [newGoal, setNewGoal] = useState(goal);
  const cardInnerRef = useRef<HTMLDivElement>(null); // This will be the element that actually flips
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Update newGoal when goal prop changes
  useEffect(() => {
    setNewGoal(goal);
    // Ensure card is unflipped when goal changes (e.g., new staff selected)
    // Only reset if it was flipped and now shouldn't be, or if initialFlipped changes
    if (isFlipped && !initialFlipped) {
      setIsFlipped(false);
      if (cardInnerRef.current) {
        gsap.set(cardInnerRef.current, { rotationY: 0 });
      }
    } else if (!isFlipped && initialFlipped) {
      setIsFlipped(true);
      if (cardInnerRef.current) {
        gsap.set(cardInnerRef.current, { rotationY: 180 });
      }
    }
  }, [goal, initialFlipped]);

  // Set initial rotation for the card inner container on mount
  useEffect(() => {
    if (cardInnerRef.current) {
      gsap.set(cardInnerRef.current, { rotationY: initialFlipped ? 180 : 0 });
    }
  }, [initialFlipped]); // Depend on initialFlipped

  const handleFlip = () => {
    if (cardInnerRef.current) {
      if (!isFlipped) {
        // Flip to back
        gsap.to(cardInnerRef.current, { duration: 0.6, rotationY: 180, ease: 'power2.inOut' });
      } else {
        // Flip to front
        gsap.to(cardInnerRef.current, { duration: 0.6, rotationY: 0, ease: 'power2.inOut' });
      }
      setIsFlipped(!isFlipped);
    }
  };

  const handleSave = () => {
    onSave(newGoal);
    handleFlip(); // Flip back after saving
  };

  const progress = goal > 0 ? (currentValue / goal) * 100 : 0;
  const status = progress >= 100 ? 'Achieved' : progress >= 70 ? 'On track' : 'Behind';
  const statusColor = progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-destructive';
  const progressBarColor = progress >= 100 ? 'bg-success' : progress >= 70 ? 'bg-warning' : 'bg-destructive';

  return (
    <div className="relative w-full h-48 perspective-1000"> {/* Added perspective */}
      <div
        ref={cardInnerRef}
        className="absolute w-full h-full preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of the card (Display) */}
        <Card
          ref={frontRef}
          className="absolute w-full h-full backface-hidden cursor-pointer flex flex-col justify-between p-4"
          onClick={handleFlip}
          style={{ transform: 'rotateY(0deg)' }} // Front always defined at 0
        >
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-center items-center">
            <div className="text-5xl font-bold text-foreground mb-2">
              {currentValue}{unit}
            </div>
            <div className="w-full">
              <Progress value={progress} className="h-2" indicatorClassName={progressBarColor} />
            </div>
          </CardContent>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className={cn("flex items-center gap-1", statusColor)}>
              <CheckCircle2Icon className="h-4 w-4" />
              {status}
            </span>
            <span className="text-muted-foreground">Goal: {goal}{unit}</span>
          </div>
        </Card>

        {/* Back of the card (Edit) */}
        <Card
          ref={backRef}
          className="absolute w-full h-full backface-hidden flex flex-col justify-between p-4"
          style={{ transform: 'rotateY(180deg)' }} // Back always defined at 180
        >
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Set Goal for {title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`goal-input-${title}`} className="text-foreground">New Goal ({unit})</Label>
              <Input
                id={`goal-input-${title}`}
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(parseFloat(e.target.value) || 0)}
                className="bg-background text-foreground"
                autoFocus
              />
            </div>
          </CardContent>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={handleFlip}>
              <XIcon className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <SaveIcon className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
