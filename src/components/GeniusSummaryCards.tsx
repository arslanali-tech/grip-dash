import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUpIcon,
  FileTextIcon,
  ClipboardCheckIcon,
  PoundSterlingIcon,
  PercentIcon,
  HandshakeIcon,
  CheckCircle2Icon,
} from 'lucide-react';

interface GeniusKpiCardProps {
  title: string;
  subtitle: string; // e.g., "YTD", "This Month"
  currentValue: number;
  target: number;
  unit?: string; // e.g., "£", "%"
  icon: React.ElementType;
  iconColor: string;
}

const GeniusKpiCard: React.FC<GeniusKpiCardProps> = ({
  title,
  subtitle,
  currentValue,
  target,
  unit = '',
  icon: Icon,
  iconColor,
}) => {
  const progress = target > 0 ? (currentValue / target) * 100 : 0;
  const status = progress >= 100 ? 'Achieved' : progress >= 70 ? 'On Track' : 'Behind';
  const statusColor = progress >= 100 ? 'text-success' : progress >= 70 ? 'text-warning' : 'text-destructive';
  const progressBarColor = progress >= 100 ? 'bg-success' : progress >= 70 ? 'bg-warning' : 'bg-destructive';

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
        <span className="text-muted-foreground">Goal: {formatValue(target, unit)}</span>
        <span className={cn("flex items-center gap-1", statusColor)}>
          <span className={cn("h-2 w-2 rounded-full", statusColor.replace('text-', 'bg-'))} />
          {status}
        </span>
      </div>
    </Card>
  );
};

export function GeniusSummaryCards() {
  // Mock data for YTD stats against target
  const cardsData: GeniusKpiCardProps[] = [
    {
      title: 'Total Number of Sale',
      subtitle: 'YTD',
      currentValue: 120,
      target: 150,
      icon: TrendingUpIcon,
      iconColor: 'text-primary',
    },
    {
      title: 'Total Sales',
      subtitle: 'YTD',
      currentValue: 550000,
      target: 700000,
      unit: '£',
      icon: PoundSterlingIcon,
      iconColor: 'text-success',
    },
    {
      title: 'Instructions',
      subtitle: 'YTD',
      currentValue: 180,
      target: 200,
      icon: FileTextIcon,
      iconColor: 'text-tertiary',
    },
    {
      title: 'Valuations',
      subtitle: 'YTD',
      currentValue: 250,
      target: 300,
      icon: ClipboardCheckIcon,
      iconColor: 'text-warning',
    },
    {
      title: 'Exchanged',
      subtitle: 'YTD',
      currentValue: 95,
      target: 100,
      icon: HandshakeIcon,
      iconColor: 'text-blue-500',
    },
    {
      title: 'Average Fee',
      subtitle: 'YTD',
      currentValue: 1.8,
      target: 2.0,
      unit: '%',
      icon: PercentIcon,
      iconColor: 'text-secondary-foreground',
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
      {cardsData.map((card, index) => (
        <GeniusKpiCard key={index} {...card} />
      ))}
    </div>
  );
}
