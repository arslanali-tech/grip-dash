import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUpIcon, UsersIcon, Building2Icon, PoundSterlingIcon, Loader2Icon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useDashboardStore } from '@/stores/dashboardStore';
import { parseISO, getMonth, getYear, format, subMonths } from 'date-fns';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface OverviewViewProps {
  agencyId?: string;
  branchName?: string;
}

export function OverviewView({ agencyId, branchName }: OverviewViewProps = {}) {
  const { movements, loadingMovements, staffMembers } = useDashboardStore();

  // Compute sales and lettings data by month from movements
  const { salesData, revenueData, summaryStats } = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    
    // Filter movements by branch if specified
    const filteredMovements = branchName 
      ? movements.filter(m => m.branch === branchName)
      : movements;

    // Initialize monthly data for the last 6 months
    const monthlyData: Record<string, { sales: number; lettings: number; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, 'MMM');
      monthlyData[key] = { sales: 0, lettings: 0, revenue: 0 };
    }

    // Aggregate movements
    let totalMovements = 0;
    let totalRevenue = 0;
    let activeListings = 0;

    filteredMovements.forEach(m => {
      if (!m.date) return;
      
      const date = parseISO(m.date);
      const monthKey = format(date, 'MMM');
      const monthsAgo = (getYear(now) - getYear(date)) * 12 + (getMonth(now) - getMonth(date));
      
      // Only include last 6 months in chart data
      if (monthsAgo >= 0 && monthsAgo < 6 && monthlyData[monthKey]) {
        if (m.type === 'sale') {
          monthlyData[monthKey].sales += 1;
        } else if (m.type === 'letting') {
          monthlyData[monthKey].lettings += 1;
        }
        monthlyData[monthKey].revenue += m.feeAmount ?? 0;
      }

      // Count all movements for summary
      totalMovements += 1;
      totalRevenue += m.feeAmount ?? 0;
      
      if (m.status === 'on-books' || m.status === 'valuation') {
        activeListings += 1;
      }
    });

    // Convert to array format for charts
    const months = Object.keys(monthlyData);
    const salesChartData = months.map(month => ({
      month,
      sales: monthlyData[month].sales,
      lettings: monthlyData[month].lettings,
    }));

    const revenueChartData = months.map(month => ({
      month,
      revenue: monthlyData[month].revenue,
    }));

    // Calculate average commission
    const completedDeals = filteredMovements.filter(m => 
      m.status === 'completed' || m.status === 'exchanged' || m.status === 'sale'
    ).length;
    const avgCommission = completedDeals > 0 ? Math.round(totalRevenue / completedDeals) : 0;

    // Get unique branches count
    const uniqueBranches = new Set(filteredMovements.map(m => m.branch)).size;

    return {
      salesData: salesChartData,
      revenueData: revenueChartData,
      summaryStats: {
        totalMovements,
        activeListings,
        teamMembers: staffMembers?.length ?? 0,
        branches: uniqueBranches,
        avgCommission,
        totalRevenue,
      },
    };
  }, [movements, staffMembers, branchName]);

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading overview data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Overview
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your properties today.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Movements</CardTitle>
            <TrendingUpIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{summaryStats.totalMovements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Active Listings</CardTitle>
            <Building2Icon className="h-5 w-5 text-tertiary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{summaryStats.activeListings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">On books & valuations</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Team Members</CardTitle>
            <UsersIcon className="h-5 w-5 text-secondary-foreground" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{summaryStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">Across {summaryStats.branches} branch{summaryStats.branches !== 1 ? 'es' : ''}</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Avg. Commission</CardTitle>
            <PoundSterlingIcon className="h-5 w-5 text-success" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">£{summaryStats.avgCommission.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per completed deal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Sales & Lettings Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))'
                  }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Bar dataKey="lettings" fill="hsl(var(--tertiary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))'
                  }}
                  formatter={(value: number) => `£${value.toLocaleString()}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--success))', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
