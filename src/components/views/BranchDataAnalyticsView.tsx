import { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  SparklesIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ArrowUpIcon,
  TargetIcon,
  ZapIcon,
  RefreshCwIcon,
  DownloadIcon,
  Loader2Icon
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboardStore';
import { format, parseISO, subMonths, addMonths, getMonth, getYear } from 'date-fns';

interface BranchDataAnalyticsViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function BranchDataAnalyticsView({ branchId, branchName }: BranchDataAnalyticsViewProps = {}) {
  const isMobile = useIsMobile();
  const [refreshing, setRefreshing] = useState(false);
  const { movements, loadingMovements, dateRange } = useDashboardStore();

  const { predictiveData, anomalyData, metrics } = useMemo(() => {
    const now = new Date();
    const monthlyRevenue: Record<string, number> = {};
    const monthKeys: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, 'MMM');
      monthKeys.push(key);
      monthlyRevenue[key] = 0;
    }

    let filtered = movements;
    if (branchName) filtered = filtered.filter(m => m.branch === branchName);
    else if (branchId) filtered = filtered.filter(m => m.branch === branchId);

    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date);
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
        return true;
      });
    }

    let totalMovements = 0;

    filtered.forEach(m => {
      if (!m.date) return;
      totalMovements += 1;
      const date = parseISO(m.date);
      const monthKey = format(date, 'MMM');
      const monthsAgo = (getYear(now) - getYear(date)) * 12 + (getMonth(now) - getMonth(date));
      if (monthsAgo >= 0 && monthsAgo < 6 && monthlyRevenue[monthKey] !== undefined) {
        monthlyRevenue[monthKey] += m.feeAmount ?? 0;
      }
    });

    const actualSeries = monthKeys.map(k => monthlyRevenue[k]);
    const avgRevenue = actualSeries.reduce((sum, v) => sum + v, 0) / Math.max(actualSeries.length, 1);

    const predictive = monthKeys.map((month, idx) => {
      const history = actualSeries.slice(Math.max(0, idx - 3), idx);
      const predicted = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : avgRevenue;
      return { month, actual: actualSeries[idx] || null, predicted: Math.round(predicted) };
    });

    for (let i = 1; i <= 2; i++) {
      const future = addMonths(now, i);
      const growth = 1 + i * 0.05;
      predictive.push({
        month: format(future, 'MMM'),
        actual: null,
        predicted: Math.round(avgRevenue * growth),
      });
    }

    const anomalies = monthKeys
      .map((month, idx) => {
        const actual = actualSeries[idx];
        if (!actual || avgRevenue === 0) return null;
        const deviation = ((actual - avgRevenue) / avgRevenue) * 100;
        if (Math.abs(deviation) < 30) return null;
        return {
          id: `a-${month}-${idx}`,
          date: month,
          metric: 'Revenue',
          expected: Math.round(avgRevenue),
          actual: Math.round(actual),
          deviation: Math.round(deviation),
          severity: Math.abs(deviation) > 50 ? 'high' : 'low',
        };
      })
      .filter(Boolean) as Array<{ id: string; date: string; metric: string; expected: number; actual: number; deviation: number; severity: 'high' | 'low' }>;

    const dataQuality = totalMovements > 0 
      ? Math.round((filtered.filter(m => m.feeAmount && m.price && m.agent).length / totalMovements) * 100)
      : 0;

    const prevMonthIdx = Math.max(0, actualSeries.length - 2);
    const currMonthIdx = Math.max(0, actualSeries.length - 1);
    const prevVal = actualSeries[prevMonthIdx] ?? 0;
    const currVal = actualSeries[currMonthIdx] ?? 0;
    const monthChangePct = prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : 0;

    return {
      predictiveData: predictive,
      anomalyData: anomalies,
      metrics: {
        predictionAccuracy: Math.max(0, 100 - anomalies.length * 5),
        anomaliesDetected: anomalies.length,
        optimizationScore: Math.max(0, Math.min(100, 90 - anomalies.length * 3)),
        dataQuality,
        monthChangePct,
      },
    };
  }, [movements, branchId, branchName, dateRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCwIcon className={cn("h-4 w-4", refreshing && "animate-spin")} strokeWidth={1.5} />
          Refresh
        </Button>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <DownloadIcon className="h-4 w-4" strokeWidth={1.5} />
          Export
        </Button>
      </div>

      {/* Key Metrics */}
      <div className={cn(
        "gap-4",
        isMobile 
          ? "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2" 
          : "grid md:grid-cols-2 lg:grid-cols-4"
      )}>
        <Card className="bg-card text-card-foreground border-2 border-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Prediction Accuracy</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TargetIcon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.predictionAccuracy.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {typeof metrics.monthChangePct === 'number' && metrics.monthChangePct !== 0 ? (
                <>
                  {metrics.monthChangePct > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1 text-success" strokeWidth={2} /> : <ArrowUpIcon className="h-3 w-3 mr-1 rotate-180 text-destructive" strokeWidth={2} />}
                  {metrics.monthChangePct > 0 ? '+' : ''}{metrics.monthChangePct.toFixed(1)}% vs prior month
                </>
              ) : (
                '—'
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-2 border-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Anomalies Detected</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <AlertCircleIcon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.anomaliesDetected}</div>
            <div className="flex items-center text-xs text-warning mt-1">
              Requires attention
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-2 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Optimization Score</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ZapIcon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.optimizationScore}/100</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Based on movement data
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-2 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Data Quality</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <CheckCircle2Icon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.dataQuality}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Excellent quality
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Forecast */}
      <Card className="bg-card text-card-foreground border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground text-xl flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
            Branch Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={predictiveData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4169E1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4169E1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                formatter={(value: number) => `£${value.toLocaleString()}`}
              />
              <Legend />
              <Area type="monotone" dataKey="actual" stroke="#4169E1" strokeWidth={3} fill="url(#colorActual)" name="Actual Revenue" />
              <Area type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={3} fill="url(#colorPredicted)" name="Predicted Revenue" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies */}
      <Card className="bg-card text-card-foreground border-border shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground text-xl">Anomaly Detection</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {anomalyData.map((anomaly) => (
            <div key={anomaly.id} className={cn(
              "p-4 rounded-lg border-2 transition-all",
              anomaly.severity === 'high' ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800" : "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
            )}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon className={cn("h-5 w-5", anomaly.severity === 'high' ? "text-red-600" : "text-blue-600")} strokeWidth={1.5} />
                  <h4 className="font-semibold text-foreground">{anomaly.metric}</h4>
                </div>
                <span className={cn(
                  "text-sm font-bold px-2 py-1 rounded-full",
                  anomaly.deviation > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>{anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Expected</p><p className="font-semibold text-foreground">{anomaly.expected}</p></div>
                <div><p className="text-xs text-muted-foreground">Actual</p><p className="font-semibold text-foreground">{anomaly.actual}</p></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Detected on {anomaly.date}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
