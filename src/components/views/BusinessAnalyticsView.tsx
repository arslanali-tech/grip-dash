import { useState, useMemo, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon, 
  PercentIcon,
  UsersIcon,
  HomeIcon,
  PoundSterlingIcon,
  DownloadIcon,
  ArrowLeftIcon,
  SparklesIcon,
  MoreVerticalIcon,
  InfoIcon,
  BanknoteIcon,
  HandshakeIcon,
  FileTextIcon,
  BarChart2Icon,
  TargetIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { DateRangePicker } from '../DateRangePicker';
import { BranchSelect } from '../BranchSelect';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfitAndLossView } from './ProfitAndLossView';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { BusinessAnalyticsSummaryCards } from '../BusinessAnalyticsSummaryCards';
import { ForecastingView } from './ForecastingView';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { CircularStatCard } from '../CircularStatCard';
import { MovementStatusCards } from '../MovementStatusCards';
import { useDashboardStore } from '@/stores/dashboardStore';
import { calculateMovementRevenue, dedupeMovementsByListing, getMovementIdentityKey, isB2BReferralMovement, isLettingsRevenueMovement, isSalesRevenueMovement } from '@/lib/movementMetrics';
import { BusinessIntelligenceView } from './BusinessIntelligenceView';
import { PerformanceManagementView } from './PerformanceManagementView';
import { DataAnalyticsView } from './DataAnalyticsView';
import { ReportingView } from './ReportingView';
import { exportElementToPdf } from '@/lib/exportPdf';

export function BusinessAnalyticsView() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overall');
  const [showPnL, setShowPnL] = useState(false);
  const [showForecasting, setShowForecasting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { filteredMovements } = useDashboardStore();
  const overallReportRef = useRef<HTMLDivElement | null>(null);
  const movementsForAnalytics = useMemo(
    () => dedupeMovementsByListing(filteredMovements),
    [filteredMovements]
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Math.round(amount));

  // Calculate dynamic data from real movements
  const dynamicData = useMemo(() => {
    const monthlyData: { [key: string]: { revenue: number; profit: number; count: number } } = {};
    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
    const recentWindowStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1); // last 3 months
    const previousWindowStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1); // previous 3 months

    const branchPerformanceMap: { [key: string]: { revenue: number; recentRevenue: number; previousRevenue: number } } = {};
    const getPctChange = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / previous) * 100;
    };

    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = { revenue: 0, profit: 0, count: 0 };
    }

    movementsForAnalytics.forEach(m => {
      if (!m.date) return;
      const moveDate = new Date(m.date);
      const isRevenueMovement =
        isSalesRevenueMovement(m) || isLettingsRevenueMovement(m) || isB2BReferralMovement(m);
      const revenue = isRevenueMovement ? calculateMovementRevenue(m) : 0;

      if (moveDate >= sixMonthsAgo && moveDate <= currentDate) {
        const monthKey = moveDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (monthlyData[monthKey]) {
          const totalCosts = revenue * (0.25 + 0.15 + 0.10 + 0.03 + 0.07);
          monthlyData[monthKey].revenue += revenue;
          monthlyData[monthKey].profit += revenue - totalCosts;
          monthlyData[monthKey].count += 1;
        }
      }

      const branchKey = m.branch || 'Unassigned';
      if (!branchPerformanceMap[branchKey]) {
        branchPerformanceMap[branchKey] = { revenue: 0, recentRevenue: 0, previousRevenue: 0 };
      }
      branchPerformanceMap[branchKey].revenue += revenue;

      if (moveDate >= recentWindowStart && moveDate <= currentDate) {
        branchPerformanceMap[branchKey].recentRevenue += revenue;
      } else if (moveDate >= previousWindowStart && moveDate < recentWindowStart) {
        branchPerformanceMap[branchKey].previousRevenue += revenue;
      }
    });

    const performanceData = Object.entries(monthlyData).map(([month, data]) => ({
      month: month.replace(' ', ' \''),
      revenue: Math.round(data.revenue),
      profit: Math.round(data.profit),
      margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0,
    }));

    const totalRevenue = Object.values(monthlyData).reduce((sum, item) => sum + item.revenue, 0);
    const estimatedCosts = {
      staffCosts: totalRevenue * 0.25,
      operationsCosts: totalRevenue * 0.15,
      marketingCosts: totalRevenue * 0.10,
      propertyCosts: totalRevenue * 0.03,
      technologyCosts: totalRevenue * 0.07,
    };

    const costBreakdownData = [
      { name: 'Staff Costs', value: Math.round(estimatedCosts.staffCosts), color: '#FFB800' },
      { name: 'Operations', value: Math.round(estimatedCosts.operationsCosts), color: '#9370DB' },
      { name: 'Marketing', value: Math.round(estimatedCosts.marketingCosts), color: '#4169E1' },
      { name: 'Property Costs', value: Math.round(estimatedCosts.propertyCosts), color: '#2E8B57' },
      { name: 'Technology', value: Math.round(estimatedCosts.technologyCosts), color: '#FF6347' },
    ];

    const branchPerformanceData = Object.entries(branchPerformanceMap)
      .map(([branch, data]) => {
        const growth = getPctChange(data.recentRevenue, data.previousRevenue);
        return {
          branch,
          revenue: Math.round(data.revenue),
          growth: Number.isFinite(growth) ? Math.round(growth * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return { performanceData, costBreakdownData, branchPerformanceData };
  }, [movementsForAnalytics]);

  // Calculate metrics
  const totalSalesValue = useMemo(() => {
    const byKey = new Map<string, number>();
    filteredMovements.forEach((m) => {
      if (!isSalesRevenueMovement(m)) return;
      const key = getMovementIdentityKey(m);
      const price = m.price ?? 0;
      const current = byKey.get(key) ?? 0;
      if (price > current) byKey.set(key, price);
    });
    return Array.from(byKey.values()).reduce((sum, v) => sum + v, 0);
  }, [filteredMovements]);

  const totalLettingsRevenue = movementsForAnalytics
    .filter(isLettingsRevenueMovement)
    .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);

  const b2bReferrals = movementsForAnalytics.filter(isB2BReferralMovement);

  const totalB2BRevenue = b2bReferrals.reduce((sum, m) => sum + calculateMovementRevenue(m), 0);

  const totalGrossRevenue = totalSalesValue + totalLettingsRevenue + totalB2BRevenue;

  // Helper: compute percent change between two numeric values
  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  };

  // Compute recent vs previous period (last 3 months vs previous 3 months)
  const computePeriodSums = () => {
    const now = new Date();
    const startRecent = new Date(now.getFullYear(), now.getMonth() - 2, 1); // last 3 months
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 5, 1); // months 4-6 ago

    let recentSales = 0;
    let prevSales = 0;
    let recentSalesValue = 0;
    let prevSalesValue = 0;
    let recentLettings = 0;
    let prevLettings = 0;
    let recentLegals = 0;
    let prevLegals = 0;
    let recentAml = 0;
    let prevAml = 0;
    let recentMortgage = 0;
    let prevMortgage = 0;

    movementsForAnalytics.forEach(m => {
      if (!m.date) return;
      const d = new Date(m.date);
      if (d >= startRecent && d <= now) {
        if (isSalesRevenueMovement(m)) {
          recentSales += calculateMovementRevenue(m);
          recentSalesValue += m.price ?? 0;
        }
        if (isLettingsRevenueMovement(m)) recentLettings += calculateMovementRevenue(m);
        if (m.status === 'legal-referral' || m.status === 'legal-signup') recentLegals += calculateMovementRevenue(m);
        if (m.status === 'aml-referral') recentAml += calculateMovementRevenue(m);
        if (m.status === 'mortgage-referral' || m.status === 'mortgage-signup') recentMortgage += calculateMovementRevenue(m);
      } else if (d >= startPrev && d < startRecent) {
        if (isSalesRevenueMovement(m)) {
          prevSales += calculateMovementRevenue(m);
          prevSalesValue += m.price ?? 0;
        }
        if (isLettingsRevenueMovement(m)) prevLettings += calculateMovementRevenue(m);
        if (m.status === 'legal-referral' || m.status === 'legal-signup') prevLegals += calculateMovementRevenue(m);
        if (m.status === 'aml-referral') prevAml += calculateMovementRevenue(m);
        if (m.status === 'mortgage-referral' || m.status === 'mortgage-signup') prevMortgage += calculateMovementRevenue(m);
      }
    });

    return {
      salesChange: pctChange(recentSales, prevSales),
      salesValueChange: pctChange(recentSalesValue, prevSalesValue),
      lettingsChange: pctChange(recentLettings, prevLettings),
      legalsChange: pctChange(recentLegals, prevLegals),
      amlChange: pctChange(recentAml, prevAml),
      mortgageChange: pctChange(recentMortgage, prevMortgage),
      grossChange: pctChange(
        recentSalesValue + recentLettings + recentLegals + recentAml + recentMortgage,
        prevSalesValue + prevLettings + prevLegals + prevAml + prevMortgage
      ),
    };
  };

  const periodChanges = computePeriodSums();

  // Split B2B revenue by type
  const amlRevenue = movementsForAnalytics
    .filter(m => m.status === 'aml-referral')
    .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);

  const legalRevenue = movementsForAnalytics
    .filter(m => ['legal-referral', 'legal-signup'].includes(m.status))
    .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);

  const mortgageRevenue = movementsForAnalytics
    .filter(m => ['mortgage-referral', 'mortgage-signup'].includes(m.status))
    .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);

  if (showForecasting) {
    return <ForecastingView onBack={() => setShowForecasting(false)} showBackButton={true} />;
  }

  if (showPnL) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border bg-background flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowPnL(false)} className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Analytics
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ProfitAndLossView />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sub-menu */}
      <div className="border-b border-border bg-card px-4 md:px-6 py-4">
        <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0 mx-auto">
              <TabsTrigger 
                value="overall" 
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Overall Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="business-intelligence" 
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Business Intelligence
              </TabsTrigger>
              <TabsTrigger 
                value="performance-management" 
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Performance Management
              </TabsTrigger>
              <TabsTrigger 
                value="data-analytics" 
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Data Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="reporting" 
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-sm border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Reporting
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="overall" className="mt-0">
            <div ref={overallReportRef} className={cn("space-y-6", isMobile ? "p-4" : "p-6 md:p-8")}> 
              {/* Header */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <BarChart2Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                    Overall Analytics
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Real-time facts and statistics from all movements
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <DateRangePicker />
                  <BranchSelect />
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                    onClick={async () => {
                      if (!overallReportRef.current) return;
                      try {
                        setExporting(true);
                        await exportElementToPdf(overallReportRef.current, {
                          filename: `overall-analytics-${new Date().toISOString().slice(0,10)}.pdf`,
                          orientation: 'landscape',
                          capture: 'scroll',
                          marginPt: 16,
                        });
                      } finally {
                        setExporting(false);
                      }
                    }}
                    disabled={exporting}
                  >
                    <DownloadIcon className="h-4 w-4" strokeWidth={1.5} />
                    {exporting ? 'Exporting…' : 'Export Report'}
                  </Button>
                </div>
              </div>

              {/* Revenue Cards */}
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
                    <CardTitle className="text-xs font-medium text-foreground">Total Sales £</CardTitle>
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <BanknoteIcon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalSalesValue)}
                    </div>
                    <div className={"flex items-center text-xs mt-1 " + (periodChanges.salesValueChange >= 0 ? 'text-success' : 'text-destructive')}>
                      <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                      {periodChanges.salesValueChange >= 0 ? '+' : ''}{periodChanges.salesValueChange.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-purple-500",
                  isMobile && "snap-center shrink-0 w-[280px]"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-foreground">Total Revenue Legals £</CardTitle>
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <FileTextIcon className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(legalRevenue)}</div>
                    <div className={"flex items-center text-xs mt-1 " + (periodChanges.legalsChange >= 0 ? 'text-success' : 'text-destructive')}>
                      <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                      {periodChanges.legalsChange >= 0 ? '+' : ''}{periodChanges.legalsChange.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-teal-500",
                  isMobile && "snap-center shrink-0 w-[280px]"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-foreground">Total Revenue AML £</CardTitle>
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                      <PoundSterlingIcon className="h-4 w-4 text-teal-600" strokeWidth={1.5} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(amlRevenue)}</div>
                    <div className={"flex items-center text-xs mt-1 " + (periodChanges.amlChange >= 0 ? 'text-success' : 'text-destructive')}>
                      <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                      {periodChanges.amlChange >= 0 ? '+' : ''}{periodChanges.amlChange.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-emerald-500",
                  isMobile && "snap-center shrink-0 w-[280px]"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-foreground">Total Revenue Financial Services £</CardTitle>
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <PoundSterlingIcon className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(mortgageRevenue)}</div>
                    <div className={"flex items-center text-xs mt-1 " + (periodChanges.mortgageChange >= 0 ? 'text-success' : 'text-destructive')}>
                      <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                      {periodChanges.mortgageChange >= 0 ? '+' : ''}{periodChanges.mortgageChange.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-cyan-500",
                  isMobile && "snap-center shrink-0 w-[280px]"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-foreground">Total Revenue Lettings £</CardTitle>
                    <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <HomeIcon className="h-4 w-4 text-cyan-600" strokeWidth={1.5} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalLettingsRevenue)}
                    </div>
                    <div className={"flex items-center text-xs mt-1 " + (periodChanges.lettingsChange >= 0 ? 'text-success' : 'text-destructive')}>
                      <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                      {periodChanges.lettingsChange >= 0 ? '+' : ''}{periodChanges.lettingsChange.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-orange-500",
                  isMobile && "snap-center shrink-0 w-[280px]"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-foreground">Total Gross Revenue £</CardTitle>
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <PoundSterlingIcon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalGrossRevenue)}
                    </div>
                    <div className={"flex items-center text-xs mt-1 " + (periodChanges.grossChange >= 0 ? 'text-success' : 'text-destructive')}>
                      <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
                      {periodChanges.grossChange >= 0 ? '+' : ''}{periodChanges.grossChange.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Movement Status Cards */}
              <MovementStatusCards />

              {/* Performance Chart */}
              <Card className="bg-card text-card-foreground border-border shadow-sm">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground text-xl">Performance Trends</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Revenue, profit, and key metrics over time</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={dynamicData.performanceData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4169E1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4169E1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2E8B57" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2E8B57" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4169E1"
                        strokeWidth={3}
                        fill="url(#colorRevenue)"
                        name="Revenue"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#2E8B57"
                        strokeWidth={3}
                        fill="url(#colorProfit)"
                        name="Net Profit"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cost Breakdown and Branch Performance */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Cost Breakdown */}
                <Card className="bg-card text-card-foreground border-border shadow-sm">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground text-xl">Cost Breakdown</CardTitle>
                    <p className="text-sm text-muted-foreground">Total operational costs distribution</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={dynamicData.costBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dynamicData.costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: number) => `£${value.toLocaleString()}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-6 space-y-3">
                      {dynamicData.costBreakdownData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-4 w-4 rounded-full shadow-sm" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            £{item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Branch Performance */}
                <Card className="bg-card text-card-foreground border-border shadow-sm">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground text-xl">Branch Performance</CardTitle>
                    <p className="text-sm text-muted-foreground">Revenue by location with growth rates</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dynamicData.branchPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="branch" 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: number) => `£${value.toLocaleString()}`}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="url(#barGradient)" 
                          radius={[8, 8, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4169E1" />
                            <stop offset="100%" stopColor="#6B8DE8" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {dynamicData.branchPerformanceData.map((branch, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs font-medium text-foreground truncate">{branch.branch}</span>
                          <span className={cn("text-xs font-bold", branch.growth >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                            {branch.growth >= 0 ? '+' : ''}{branch.growth}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="business-intelligence" className="mt-0">
              <BusinessIntelligenceView />
            </TabsContent>

            <TabsContent value="performance-management" className="mt-0">
              <PerformanceManagementView />
            </TabsContent>

            <TabsContent value="data-analytics" className="mt-0">
              <DataAnalyticsView />
            </TabsContent>

          <TabsContent value="reporting" className="mt-0">
            <ReportingView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
