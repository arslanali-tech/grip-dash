import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUpIcon, CheckCircle2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalTrackingCardProps {
  title: string;
  target: number;
  current: number;
  icon: React.ElementType;
  iconColor: string;
}

export function GoalTrackingCard({ title, target, current, icon: Icon, iconColor }: GoalTrackingCardProps) {
  const progress = target > 0 ? (current / target) * 100 : 0;
  const isOnTrack = progress >= 80;

  return (
    <Card className="bg-white dark:bg-card rounded-2xl shadow-lg border-0 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-muted">
            <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={1.5} />
          </div>
          <CardTitle className="text-base font-bold text-gray-900 dark:text-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">
            {title} target: <span className="font-semibold text-gray-700 dark:text-foreground">{target.toLocaleString()}</span>
          </p>
          <div className="relative h-2 w-full bg-gray-200 dark:bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 rounded-full bg-blue-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-muted-foreground">Current:</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-primary">{current.toLocaleString()}</p>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            isOnTrack 
              ? "bg-green-100 dark:bg-green-900/30" 
              : "bg-orange-100 dark:bg-orange-900/30"
          )}>
            <div className={cn(
              "h-2 w-2 rounded-full",
              isOnTrack ? "bg-green-600" : "bg-orange-600"
            )} />
            <span className={cn(
              "text-xs font-semibold",
              isOnTrack 
                ? "text-green-700 dark:text-green-400" 
                : "text-orange-700 dark:text-orange-400"
            )}>
              {isOnTrack ? "On track" : "Behind"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
