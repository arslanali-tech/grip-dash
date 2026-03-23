import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  PoundSterlingIcon,
  UsersIcon,
  Building2Icon,
  HomeIcon,
  DownloadIcon,
  BarChart2Icon,
  CheckCircle2Icon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { DateRangePicker } from '../DateRangePicker';
import { useEffect, useRef, useState } from 'react';
import { fetchRevenueSeriesDynamic, RevenuePointRow } from '@/lib/ownerApi';
import { exportElementToPdf } from '@/lib/exportPdf';
import { notifyError, notifySuccess } from '@/lib/notify';
import { fetchBranchPerformanceMetrics, BranchPerformanceMetrics } from '@/lib/dashboardApi';
import { fetchStaffCommissionTotals, StaffCommissionTotal } from '@/lib/commissionApi';

interface OwnerAnalyticsViewProps {
  agencyId?: string;
}

export function OwnerAnalyticsView({ agencyId }: OwnerAnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined });
  const [gripRevenueData, setGripRevenueData] = useState<RevenuePointRow[]>([]);
  const [clientRevenueData, setClientRevenueData] = useState<RevenuePointRow[]>([]);
  const [branchMetrics, setBranchMetrics] = useState<BranchPerformanceMetrics[]>([]);
  const [staffTotals, setStaffTotals] = useState<StaffCommissionTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!agencyId) return;
      setLoading(true);
      const fromStr = dateRange.from ? dateRange.from.toISOString().slice(0, 10) : undefined;
      const toStr = dateRange.to ? dateRange.to.toISOString().slice(0, 10) : undefined;
      const [grip, client, branches, staff] = await Promise.all([
        fetchRevenueSeriesDynamic(agencyId, 'grip', fromStr, toStr),
        fetchRevenueSeriesDynamic(agencyId, 'client', fromStr, toStr),
        fetchBranchPerformanceMetrics(agencyId),
        fetchStaffCommissionTotals(agencyId),
      ]);
      setGripRevenueData(grip);
      setClientRevenueData(client);
      setBranchMetrics(branches);
      setStaffTotals(staff);
      setLoading(false);
    };
    void load();
  }, [agencyId, dateRange.from, dateRange.to]);

  const mapSeriesToChart = (rows: RevenuePointRow[]) =>
    rows.map(r => ({ month: r.period, revenue: r.revenue }));

  const gripSeries = mapSeriesToChart(gripRevenueData);
  const clientSeries = mapSeriesToChart(clientRevenueData);

  // Colors for charts
  const BRANCH_COLORS = ['#4169E1', '#2E8B57', '#FF6B6B', '#FFD93D', '#6BCB77', '#C9B1FF', '#FF8C94', '#A8E6CF'];
  
  // Prepare branch comparison data
  const branchComparisonData = branchMetrics
    .map(b => ({
      name: b.branchName || 'Unknown',
      revenue: b.totalRevenue,
      sales: b.totalSales,
      lettings: b.totalLettings,
      completions: b.completions,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Prepare staff performance data (top 10 by commission)
  const staffPerformanceData = staffTotals
    .map(s => ({
      name: s.staffName || 'Unknown',
      branch: s.branchName || 'Unknown',
      totalCommission: s.totalCommission,
      paidCommission: s.paidCommission,
      pendingCommission: s.pendingCommission,
    }))
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, 10);

  const handleExportReport = async () => {
    const el = reportRef.current;
    if (!el) {
      notifyError('Nothing to export yet.');
      return;
    }

    try {
      setExporting(true);
      const today = new Date().toISOString().slice(0, 10);
      await exportElementToPdf(el, {
        filename: `grip-owner-analytics-${today}.pdf`,
        orientation: 'landscape',
      });
      notifySuccess('PDF report downloaded.');
    } catch (e) {
      console.error('Export PDF failed', e);
      notifyError('Could not export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleExportReport}
          disabled={exporting || loading}
        >
          <DownloadIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {exporting ? 'Exporting…' : 'Export Report'}
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center">
          <DateRangePicker onChange={setDateRange} value={dateRange} />
          {/* No BranchSelect here as it's owner-level analytics */}
        </div>

        {/* Key Metrics Overview - Moved to OwnerDashboard */}

        {loading && (
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        )}

        {/* GRIP Revenue Trend */}
        <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">GRIP Revenue Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Overall revenue performance over time</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gripSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))'
                }}
                formatter={(value: number) => `£${value.toLocaleString()}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#4169E1" 
                strokeWidth={3}
                name="Revenue"
                dot={{ fill: '#4169E1', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Client Revenue Trend */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Client Revenue Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Revenue generated from clients over time</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={clientSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))'
                }}
                formatter={(value: number) => `£${value.toLocaleString()}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2E8B57" 
                strokeWidth={3}
                name="Client Revenue"
                dot={{ fill: '#2E8B57', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Branch-wise Comparison */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Building2Icon className="h-5 w-5" />
            Branch Performance Comparison
          </CardTitle>
          <p className="text-sm text-muted-foreground">Revenue and sales by branch</p>
        </CardHeader>
        <CardContent>
          {branchComparisonData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No branch data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={branchComparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `£${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : name === 'sales' ? 'Sales' : name === 'lettings' ? 'Lettings' : 'Completions'
                  ]}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#4169E1" name="Revenue" radius={[0, 4, 4, 0]}>
                  {branchComparisonData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BRANCH_COLORS[index % BRANCH_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Staff Performance Summary */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Staff Performance Summary
          </CardTitle>
          <p className="text-sm text-muted-foreground">Top performers by commission earned</p>
        </CardHeader>
        <CardContent>
          {staffPerformanceData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No staff performance data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={staffPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))'
                  }}
                  formatter={(value: number, name: string) => [
                    `£${value.toLocaleString()}`,
                    name === 'paidCommission' ? 'Paid' : name === 'pendingCommission' ? 'Pending' : 'Total'
                  ]}
                />
                <Legend />
                <Bar dataKey="paidCommission" stackId="a" fill="#2E8B57" name="Paid" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendingCommission" stackId="a" fill="#FFD93D" name="Pending" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Branch Activity Summary Table */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Branch Activity Summary</CardTitle>
          <p className="text-sm text-muted-foreground">Detailed breakdown by branch</p>
        </CardHeader>
        <CardContent>
          {branchMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No branch data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Branch</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Sales</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Lettings</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Completions</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Exchanges</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {branchMetrics.map((branch, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{branch.branchName || 'Unknown'}</td>
                      <td className="py-3 px-2 text-right">{branch.totalSales}</td>
                      <td className="py-3 px-2 text-right">{branch.totalLettings}</td>
                      <td className="py-3 px-2 text-right">{branch.completions}</td>
                      <td className="py-3 px-2 text-right">{branch.exchanges}</td>
                      <td className="py-3 px-2 text-right font-semibold text-green-600">
                        £{branch.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td className="py-3 px-2 font-bold">Total</td>
                    <td className="py-3 px-2 text-right font-bold">{branchMetrics.reduce((sum, b) => sum + b.totalSales, 0)}</td>
                    <td className="py-3 px-2 text-right font-bold">{branchMetrics.reduce((sum, b) => sum + b.totalLettings, 0)}</td>
                    <td className="py-3 px-2 text-right font-bold">{branchMetrics.reduce((sum, b) => sum + b.completions, 0)}</td>
                    <td className="py-3 px-2 text-right font-bold">{branchMetrics.reduce((sum, b) => sum + b.exchanges, 0)}</td>
                    <td className="py-3 px-2 text-right font-bold text-green-600">
                      £{branchMetrics.reduce((sum, b) => sum + b.totalRevenue, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
