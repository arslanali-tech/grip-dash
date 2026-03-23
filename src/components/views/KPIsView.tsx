import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  TargetIcon,
  DollarSignIcon,
  PercentIcon,
  UsersIcon,
  Building2Icon,
  CheckCircle2Icon,
  GaugeIcon,
  Loader2Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboardStore';

interface KPIsViewProps {
  agencyId?: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
  iconColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, changeType, icon: Icon, iconColor }) => {
  const changeColor = changeType === 'increase' ? 'text-success' : changeType === 'decrease' ? 'text-destructive' : 'text-muted-foreground';
  const ChangeIcon = changeType === 'increase' ? TrendingUpIcon : changeType === 'decrease' ? TrendingDownIcon : null;

  return (
    <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} strokeWidth={1.5} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center text-xs mt-1">
          {ChangeIcon && <ChangeIcon className={cn("h-3 w-3 mr-1", changeColor)} strokeWidth={2} />}
          <span className={changeColor}>{change}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export function KPIsView({ agencyId }: KPIsViewProps) {
  const { movements, loadingMovements, staffMembers, branches } = useDashboardStore();

  const kpis = useMemo(() => {
    // Calculate KPIs from movements data
    const totalRevenue = movements.reduce((sum, m) => sum + (m.feeAmount ?? 0), 0);
    const completedStatuses = ['completed', 'exchanged', 'sale'];
    const completedMovements = movements.filter(m => completedStatuses.includes(m.status ?? ''));
    const completedCount = completedMovements.length;
    
    // Conversion rate: completed / total (excluding valuations)
    const nonValuationMovements = movements.filter(m => m.status !== 'valuation');
    const conversionRate = nonValuationMovements.length > 0 
      ? Math.round((completedCount / nonValuationMovements.length) * 100) 
      : 0;
    
    // Average deal value
    const avgDealValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;
    
    // Active staff count
    const activeStaffCount = staffMembers?.length ?? 0;
    
    // Branches count
    const branchesCount = branches?.length ?? 0;
    
    // Format revenue
    const formatRevenue = (amount: number) => {
      if (amount >= 1000000) {
        return `£${(amount / 1000000).toFixed(1)}M`;
      } else if (amount >= 1000) {
        return `£${(amount / 1000).toFixed(0)}K`;
      }
      return `£${amount.toLocaleString()}`;
    };

    return [
      {
        title: 'Total Revenue',
        value: formatRevenue(totalRevenue),
        change: `${movements.length} total movements`,
        changeType: 'neutral' as const,
        icon: DollarSignIcon,
        iconColor: 'text-success',
      },
      {
        title: 'Completed Deals',
        value: completedCount.toString(),
        change: `${completedStatuses.join('/')} status`,
        changeType: completedCount > 0 ? 'increase' as const : 'neutral' as const,
        icon: TargetIcon,
        iconColor: 'text-primary',
      },
      {
        title: 'Conversion Rate',
        value: `${conversionRate}%`,
        change: 'Completed vs total',
        changeType: conversionRate >= 50 ? 'increase' as const : conversionRate > 0 ? 'neutral' as const : 'decrease' as const,
        icon: CheckCircle2Icon,
        iconColor: 'text-blue-500',
      },
      {
        title: 'Average Deal Value',
        value: `£${avgDealValue.toLocaleString()}`,
        change: 'Per completed deal',
        changeType: 'neutral' as const,
        icon: GaugeIcon,
        iconColor: 'text-tertiary',
      },
      {
        title: 'Active Staff',
        value: activeStaffCount.toString(),
        change: `Across ${branchesCount} branch${branchesCount !== 1 ? 'es' : ''}`,
        changeType: 'neutral' as const,
        icon: UsersIcon,
        iconColor: 'text-secondary-foreground',
      },
      {
        title: 'Branches Managed',
        value: branchesCount.toString(),
        change: 'Active locations',
        changeType: 'neutral' as const,
        icon: Building2Icon,
        iconColor: 'text-warning',
      },
    ];
  }, [movements, staffMembers, branches]);

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading KPIs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="space-y-1 mb-6">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Overall Key Performance Indicators
        </h1>
        <p className="text-muted-foreground">
          Track the most important metrics for your entire business.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <KpiCard key={index} {...kpi} />
        ))}
      </div>
    </div>
  );
}
