import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { fetchMovementAnalytics, MovementAnalytics } from '@/lib/dashboardApi';
import { 
  TrendingUpIcon, 
  HomeIcon, 
  KeyIcon, 
  ClipboardCheckIcon,
  CheckCircle2Icon,
  ArrowLeftRightIcon,
  XCircleIcon,
  PoundSterlingIcon,
  PercentIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MovementAnalyticsCardsProps {
  agencyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function AnalyticsCard({ title, value, icon: Icon, color, bgColor }: AnalyticsCardProps) {
  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MovementAnalyticsCards({ agencyId, dateFrom, dateTo }: MovementAnalyticsCardsProps) {
  const [analytics, setAnalytics] = useState<MovementAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!agencyId) return;
      setLoading(true);
      const data = await fetchMovementAnalytics(agencyId, dateFrom, dateTo);
      setAnalytics(data);
      setLoading(false);
    };
    void load();
  }, [agencyId, dateFrom, dateTo]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);

  if (!agencyId) return null;

  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-4">
              <div className="h-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Movements',
      value: analytics.totalMovements,
      icon: TrendingUpIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Sales',
      value: analytics.salesCount,
      icon: HomeIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Lettings',
      value: analytics.lettingsCount,
      icon: KeyIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Valuations',
      value: analytics.valuationsCount,
      icon: ClipboardCheckIcon,
      color: 'text-pink-600',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Completed',
      value: analytics.completedCount,
      icon: CheckCircle2Icon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Exchanged',
      value: analytics.exchangedCount,
      icon: ArrowLeftRightIcon,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Aborts',
      value: analytics.abortsCount,
      icon: XCircleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics.totalRevenue),
      icon: PoundSterlingIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Avg Deal Value',
      value: formatCurrency(analytics.avgDealValue),
      icon: PoundSterlingIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Conversion Rate',
      value: `${analytics.conversionRate.toFixed(1)}%`,
      icon: PercentIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((card, index) => (
        <AnalyticsCard key={index} {...card} />
      ))}
    </div>
  );
}
