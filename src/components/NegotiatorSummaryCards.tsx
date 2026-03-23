import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BanknoteIcon, TrendingUpIcon, FileTextIcon, ClipboardCheckIcon, PoundSterlingIcon, PercentIcon, HandshakeIcon } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';

export function NegotiatorSummaryCards() {
  const { filteredMovements } = useDashboardStore();
  
  const totalNumberOfSale = filteredMovements.filter(m => m.type === 'sale').length;
  const valuations = filteredMovements.filter(m => m.status === 'valuation').length;
  
  const exchangedCount = filteredMovements.filter(m => m.status === 'exchanged').length;
  const exchangedValue = filteredMovements
    .filter(m => m.status === 'exchanged')
    .reduce((sum, m) => sum + m.price, 0);

  const averageFee = 1.5; 
  const totalSalesValue = filteredMovements
    .filter(m => m.status === 'sale')
    .reduce((sum, m) => sum + m.price, 0);

  const cards = [
    {
      id: 'total-sales-value',
      title: 'Total Sales £',
      value: (
        <div className="flex items-baseline gap-2">
          <span>{totalNumberOfSale}</span>
          <span className="text-sm text-muted-foreground font-normal">£{totalSalesValue.toLocaleString()}</span>
        </div>
      ),
      icon: BanknoteIcon,
      iconColor: 'text-orange-600',
    },
    {
      id: 'on-books',
      title: 'On Books',
      value: (
        <div className="flex items-baseline gap-2">
          <span>{filteredMovements.filter(m => m.status === 'on-books').length}</span>
          <span className="text-sm text-muted-foreground font-normal">
            ({valuations > 0 ? ((filteredMovements.filter(m => m.status === 'on-books').length / valuations) * 100).toFixed(1) : 0}% conversion)
          </span>
        </div>
      ),
      icon: FileTextIcon,
      iconColor: 'text-yellow-600',
    },
    {
      id: 'valuations',
      title: 'Valuations',
      value: (
        <div className="flex items-baseline gap-2">
          <span>{valuations}</span>
          <span className="text-sm text-muted-foreground font-normal">({Math.max(0, 10 - valuations)} Left to attend)</span>
        </div>
      ),
      icon: ClipboardCheckIcon,
      iconColor: 'text-pink-600',
    },
    {
      id: 'exchanged',
      title: 'Exchanged',
      value: (
        <div className="flex items-baseline gap-2">
          <span>{exchangedCount}</span>
          <span className="text-sm text-muted-foreground font-normal">£{exchangedValue.toLocaleString()}</span>
        </div>
      ),
      icon: HandshakeIcon,
      iconColor: 'text-green-600',
    },
    {
      id: 'avg-fee',
      title: 'Average Fee',
      value: (
        <div className="flex items-baseline gap-2">
          <span>{averageFee}%</span>
          <span className="text-sm text-muted-foreground font-normal">£4,580</span>
        </div>
      ),
      icon: PercentIcon,
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="mb-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 xl:mb-6 xl:grid xl:grid-cols-6 xl:gap-4 xl:overflow-visible xl:snap-none xl:pb-0">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const delay = `${index * 100}ms`;
        return (
          <Card
            key={card.id}
            className={cn(
              "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-500",
              "snap-center shrink-0 w-[280px] xl:w-auto xl:shrink xl:snap-none",
              card.iconColor.replace('text-', 'border-')
            )}
            style={{ animationDelay: delay }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-foreground">{card.title}</CardTitle>
              <Icon className={cn("h-4 w-4", card.iconColor)} strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
