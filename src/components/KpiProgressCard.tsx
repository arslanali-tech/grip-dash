import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface KpiProgressCardProps {
  title: string;
  subtitle: string;
  currentValue: number;
  goal: number;
  unit?: string; // e.g., "£", "%"
  progressBarColor: string; // Tailwind class for the progress bar fill
  statusText: string; // e.g., "On Track", "Behind", "Achieved"
  statusColor: string; // Tailwind class for the status text and dot
}

export function KpiProgressCard({
  title,
  subtitle,
  currentValue,
  goal,
  unit = '',
  progressBarColor,
  statusText,
  statusColor,
}: KpiProgressCardProps) {
  const progress = goal > 0 ? (currentValue / goal) * 100 : 0;

  const formatValue = (value: number, unit: string) => {
    if (unit === '£') {
      return `£${value.toLocaleString()}`;
    }
    if (unit === '%') {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className="bg-card text-card-foreground p-4 flex flex-col justify-between h-48">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col justify-center items-center">
        <div className="text-5xl font-bold text-foreground mb-2">
          {formatValue(currentValue, unit)}
        </div>
        <div className="w-full">
          <Progress value={progress} className="h-2" indicatorClassName={progressBarColor} />
        </div>
      </CardContent>
      <div className="flex justify-between items-center text-sm mt-2">
        <span className="text-muted-foreground">Goal: {formatValue(goal, unit)}</span>
        <span className={cn("flex items-center gap-1", statusColor)}>
          <span className={cn("h-2 w-2 rounded-full", statusColor.replace('text-', 'bg-'))} />
          {statusText}
        </span>
      </div>
    </Card>
  );
}
