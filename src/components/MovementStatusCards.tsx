import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardStore } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  count: number;
  color: string;
  borderColor: string;
}

function StatusCard({ title, count, color, borderColor }: StatusCardProps) {
  const [displayCount, setDisplayCount] = React.useState(0);

  React.useEffect(() => {
    // Animate count from 0 to actual value
    let start = 0;
    const end = count;
    const duration = 1000; // 1 second
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayCount(end);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [count]);

  return (
    <Card className={cn(
      "bg-card text-card-foreground overflow-hidden relative hover:shadow-lg transition-all duration-200 cursor-pointer border-2",
      borderColor
    )}>
      <CardContent className="flex flex-col items-center justify-center py-6 px-4">
        {/* Large number with animation */}
        <div className="text-4xl font-bold text-foreground mb-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
          {displayCount}
        </div>
        
        {/* Status label */}
        <p className="text-xs text-muted-foreground text-center font-medium animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
          {title}
        </p>
      </CardContent>
    </Card>
  );
}


export function MovementStatusCards() {
  const { filteredMovements } = useDashboardStore();

  const onBooksCount = filteredMovements.filter(m => m.status === 'on-books').length;
  const offersCount = filteredMovements.filter(m => m.status === 'offer' || m.status === 'let-offer').length;
  const valuationsCount = filteredMovements.filter(m => m.status === 'valuation').length;
  const exchangedCount = filteredMovements.filter(m => m.status === 'exchanged').length;
  const completedCount = filteredMovements.filter(m => m.status === 'completed').length;
  const letCount = filteredMovements.filter(m => m.status === 'let').length;

  const statusCards = [
    { title: 'On Books', count: onBooksCount, color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
    { title: 'Offers', count: offersCount, color: 'bg-blue-500', borderColor: 'border-blue-500' },
    { title: 'Valuations', count: valuationsCount, color: 'bg-pink-600', borderColor: 'border-pink-600' },
    { title: 'Exchanged', count: exchangedCount, color: 'bg-green-500', borderColor: 'border-green-500' },
    { title: 'Completed', count: completedCount, color: 'bg-purple-500', borderColor: 'border-purple-500' },
    { title: 'Let', count: letCount, color: 'bg-cyan-500', borderColor: 'border-cyan-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statusCards.map((card, index) => (
        <StatusCard
          key={index}
          title={card.title}
          count={card.count}
          color={card.color}
          borderColor={card.borderColor}
        />
      ))}
    </div>
  );
}
