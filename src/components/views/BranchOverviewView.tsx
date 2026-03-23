import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUpIcon, 
  PoundSterlingIcon, 
  PercentIcon, 
  HomeIcon, 
  BriefcaseIcon,
  DollarSignIcon,
  Loader2Icon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboardStore } from '@/stores/dashboardStore';
import { format, parseISO, subMonths, getMonth, getYear } from 'date-fns';

interface BranchOverviewViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function BranchOverviewView({ agencyId, branchId, branchName }: BranchOverviewViewProps = {}) {
  const isMobile = useIsMobile();
  const { movements, loadingMovements, dateRange } = useDashboardStore();

  const {
    branchPerformanceData,
    salesVsLettingsData,
    summaryStats,
  } = useMemo(() => {
    const now = new Date();
    const monthlyData: Record<string, { revenue: number; sales: number; lettings: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, 'MMM');
      monthlyData[key] = { revenue: 0, sales: 0, lettings: 0 };
    }

    // Filter movements by branch and date range
    let filtered = movements;
    if (branchName) {
      filtered = filtered.filter(m => m.branch === branchName);
    } else if (branchId) {
      filtered = filtered.filter(m => m.branch === branchId);
    }

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
        return true;
      });
    }

    let totalRevenue = 0;
    let completedDeals = 0;
    let propertiesSold = 0;
    const feePercentages: number[] = [];

    filtered.forEach(m => {
      if (!m.date) return;
      const date = parseISO(m.date);
      const monthKey = format(date, 'MMM');
      const monthsAgo = (getYear(now) - getYear(date)) * 12 + (getMonth(now) - getMonth(date));
      
      if (monthsAgo >= 0 && monthsAgo < 6 && monthlyData[monthKey]) {
        if (m.type === 'sale') monthlyData[monthKey].sales += 1;
        if (m.type === 'letting') monthlyData[monthKey].lettings += 1;
        monthlyData[monthKey].revenue += m.feeAmount ?? 0;
      }

      totalRevenue += m.feeAmount ?? 0;

      if (m.feePercentage) feePercentages.push(m.feePercentage);

      if (m.status === 'completed' || m.status === 'exchanged' || m.status === 'sale') {
        completedDeals += 1;
        if (m.type === 'sale') propertiesSold += 1;
      }
    });

    const avgFeePercentage = feePercentages.length > 0 
      ? feePercentages.reduce((a, b) => a + b, 0) / feePercentages.length 
      : 30;
    const profitMargin = avgFeePercentage || 30;
    const profit = Math.round(totalRevenue * (profitMargin / 100));
    const avgDealValue = completedDeals > 0 ? Math.round(totalRevenue / completedDeals) : 0;

    const months = Object.keys(monthlyData);
    const performance = months.map(month => ({
      month,
      revenue: monthlyData[month].revenue,
      profit: Math.round(monthlyData[month].revenue * (profitMargin / 100)),
      margin: profitMargin,
    }));

    const salesLettings = months.map(month => ({
      month,
      sales: monthlyData[month].sales,
      lettings: monthlyData[month].lettings,
    }));

    return {
      branchPerformanceData: performance,
      salesVsLettingsData: salesLettings,
      summaryStats: {
        revenue: totalRevenue,
        profit,
        margin: profitMargin,
        totalDeals: completedDeals,
        propertiesSold,
        avgDealValue,
      },
    };
  }, [movements, branchId, branchName, dateRange]);

  const formatCompactCurrency = (value: number) => {
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `£${Math.round(value / 1_000)}K`;
    return `£${value.toLocaleString()}`;
  };

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading branch analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className={cn(
        "gap-4",
        isMobile 
          ? "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2" 
          : "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      )}>
        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-blue-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Branch Revenue</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <PoundSterlingIcon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCompactCurrency(summaryStats.revenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Based on selected range
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-green-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Branch Profit</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSignIcon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCompactCurrency(summaryStats.profit)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Estimated profit
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-purple-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Profit Margin</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <PercentIcon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summaryStats.margin.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Avg fee percentage
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-orange-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Total Deals</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <BriefcaseIcon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summaryStats.totalDeals.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Completed deals
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-cyan-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Properties Sold</CardTitle>
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <HomeIcon className="h-4 w-4 text-cyan-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summaryStats.propertiesSold.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Sales completed
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-pink-500",
          isMobile && "snap-center shrink-0 w-[280px]"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Avg Deal Value</CardTitle>
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
              <TrendingUpIcon className="h-4 w-4 text-pink-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{summaryStats.avgDealValue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Avg commission per deal
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Branch Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={branchPerformanceData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4169E1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4169E1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => `£${value.toLocaleString()}`}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#4169E1" strokeWidth={3} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fill="url(#colorProfit)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Sales vs Lettings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesVsLettingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="sales" fill="#4169E1" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="lettings" fill="#9370DB" radius={[4, 4, 0, 0]} name="Lettings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
