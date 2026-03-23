import { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  TargetIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  ZapIcon,
  SparklesIcon,
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

interface BranchIntelligenceViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function BranchIntelligenceView({ branchId, branchName }: BranchIntelligenceViewProps = {}) {
  const isMobile = useIsMobile();
  const { movements, loadingMovements, dateRange } = useDashboardStore();

  const { predictiveData, anomalyData, keyInsights, metrics } = useMemo(() => {
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

    let completedDeals = 0;
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
      if (m.status === 'completed' || m.status === 'exchanged' || m.status === 'sale') {
        completedDeals += 1;
      }
    });

    const actualSeries = monthKeys.map(k => monthlyRevenue[k]);
    const avgRevenue = actualSeries.reduce((sum, v) => sum + v, 0) / Math.max(actualSeries.length, 1);

    // Build predictive data with simple moving average
    const predictive = monthKeys.map((month, idx) => {
      const history = actualSeries.slice(Math.max(0, idx - 3), idx);
      const predicted = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : avgRevenue;
      return { month, actual: actualSeries[idx] || null, predicted: Math.round(predicted) };
    });

    // Add next 2 forecast months
    for (let i = 1; i <= 2; i++) {
      const future = addMonths(now, i);
      const growth = 1 + i * 0.05;
      predictive.push({
        month: format(future, 'MMM'),
        actual: null,
        predicted: Math.round(avgRevenue * growth),
      });
    }

    // Accuracy (MAPE)
    const mape = predictive
      .filter(p => p.actual && p.actual > 0)
      .map(p => Math.abs((p.actual! - p.predicted) / p.actual!) * 100);
    const avgMape = mape.length > 0 ? mape.reduce((a, b) => a + b, 0) / mape.length : 0;
    const predictionAccuracy = Math.max(0, Math.min(100, 100 - avgMape));

    // Anomalies: months deviating >30% from avg
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

    // Insights
    const last = actualSeries[actualSeries.length - 1] ?? 0;
    const prev = actualSeries[actualSeries.length - 2] ?? 0;
    const change = prev > 0 ? ((last - prev) / prev) * 100 : 0;

    const insights = [
      {
        id: 'i1',
        title: change >= 0 ? 'Revenue Momentum' : 'Revenue Dip',
        description: change >= 0 
          ? 'Revenue is trending up compared to last month.'
          : 'Revenue dropped compared to last month. Review pipeline activity.',
        impact: change >= 0 ? 'positive' : 'negative',
        metric: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        icon: change >= 0 ? TrendingUpIcon : TrendingDownIcon,
      },
      {
        id: 'i2',
        title: 'Conversion Rate',
        description: 'Completed deals vs total movements.',
        impact: 'positive',
        metric: `${totalMovements > 0 ? Math.round((completedDeals / totalMovements) * 100) : 0}%`,
        icon: TrendingUpIcon,
      },
    ];

    const dataQuality = totalMovements > 0 
      ? Math.round((filtered.filter(m => m.feeAmount && m.price && m.agent).length / totalMovements) * 100)
      : 0;
    const optimizationScore = Math.max(0, Math.min(100, 100 - anomalies.length * 5 - (100 - dataQuality) * 0.1));

    return {
      predictiveData: predictive,
      anomalyData: anomalies,
      keyInsights: insights,
      metrics: {
        predictionAccuracy,
        anomaliesDetected: anomalies.length,
        optimizationScore: Math.round(optimizationScore),
        dataQuality,
      },
    };
  }, [movements, branchId, branchName, dateRange]);

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading intelligence data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Based on recent data
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
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Updated with latest data
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
              Data completeness
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

      {/* Insights & Anomalies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground text-xl">Branch Insights</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {keyInsights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.id} className={cn(
                  "p-4 rounded-lg border-2 transition-all",
                  insight.impact === 'positive' ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800" :
                  "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      insight.impact === 'positive' ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                    )}>
                      <Icon className={cn("h-5 w-5", insight.impact === 'positive' ? "text-green-600" : "text-red-600")} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-foreground">{insight.title}</h4>
                        <span className={cn(
                          "text-sm font-bold px-2 py-1 rounded-full",
                          insight.impact === 'positive' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>{insight.metric}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

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
    </div>
  );
}
