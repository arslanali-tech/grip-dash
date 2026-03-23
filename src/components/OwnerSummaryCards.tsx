import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
  Building2Icon,
  HomeIcon,
  PoundSterlingIcon,
  BarChart2Icon,
  CheckCircle2Icon,
} from 'lucide-react';
import { fetchOwnerMetrics, fetchOwnerMetricsLive, OwnerMetricsRow } from '@/lib/ownerApi';

interface OwnerSummaryCardsProps {
  agencyId?: string;
}

export function OwnerSummaryCards({ agencyId }: OwnerSummaryCardsProps) {
  const [metrics, setMetrics] = useState<OwnerMetricsRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!agencyId) return;
      setLoading(true);

      // Prefer live computed metrics; fallback to snapshot table if live computation is unavailable.
      const live = await fetchOwnerMetricsLive(agencyId);
      if (live) {
        setMetrics(live);
        setLoading(false);
        return;
      }

      const snapshot = await fetchOwnerMetrics(agencyId);
      setMetrics(snapshot);
      setLoading(false);
    };
    void load();
  }, [agencyId]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '–';
    return `£${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatInt = (value: number | null | undefined) => {
    if (value == null) return '–';
    return value.toLocaleString();
  };

  const formatChange = (value: number | null | undefined) => {
    if (value == null) return '–';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const isLoadingOrEmpty = loading && !metrics;

  const renderChange = (value: number | null | undefined) => {
    if (isLoadingOrEmpty) {
      return (
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          …
        </div>
      );
    }

    if (value == null) {
      return (
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          –
        </div>
      );
    }

    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;
    const color = isPositive ? 'text-success' : 'text-destructive';

    return (
      <div className={`flex items-center text-xs mt-1 ${color}`}>
        <Icon className="h-3 w-3 mr-1" strokeWidth={2} />
        {formatChange(value)}
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 mb-6">
        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">GRIP Revenue</CardTitle>
            <PoundSterlingIcon className="h-4 w-4 text-success" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatCurrency(metrics?.grip_revenue)}
            </div>
            {renderChange(metrics?.grip_revenue_change)}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">Sign Ups</CardTitle>
            <UsersIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatInt(metrics?.signups)}
            </div>
            {renderChange(metrics?.signups_change)}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">No. of Branches</CardTitle>
            <Building2Icon className="h-4 w-4 text-tertiary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatInt(metrics?.branches)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Across portfolio
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">No. of Movements</CardTitle>
            <HomeIcon className="h-4 w-4 text-warning" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatInt(metrics?.movements)}
            </div>
            {renderChange(metrics?.movements_change)}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">Client Revenue</CardTitle>
            <PoundSterlingIcon className="h-4 w-4 text-success" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatCurrency(metrics?.client_revenue)}
            </div>
            {renderChange(metrics?.client_revenue_change)}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">No. Prospects</CardTitle>
            <BarChart2Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatInt(metrics?.prospects)}
            </div>
            {renderChange(metrics?.prospects_change)}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="min-w-0 truncate text-sm font-medium text-foreground">Prospects Converted</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-success" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingOrEmpty ? '…' : formatInt(metrics?.prospects_converted)}
            </div>
            {renderChange(metrics?.prospects_converted_change)}
          </CardContent>
        </Card>
      </div>
  );
}
