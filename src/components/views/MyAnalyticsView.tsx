import { useMemo } from 'react';
import { format, isValid, parseISO, endOfDay, startOfDay } from 'date-fns';
import {
  TrendingUpIcon,
  PoundSterlingIcon,
  PercentIcon,
  HomeIcon,
  DownloadIcon,
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
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '../DateRangePicker';
import { useNegotiatorStore } from '@/stores/negotiatorStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';

const normalizeName = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ');

const toLocalNameFromEmail = (value: string | null | undefined): string =>
  normalizeName((value ?? '').split('@')[0] ?? '');

const parseDateSafe = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsedIso = parseISO(value);
  if (isValid(parsedIso)) return parsedIso;
  const parsedDate = new Date(value);
  return Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
};

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isCompletedStatus = (status: string | null | undefined): boolean => {
  const normalized = (status ?? '').trim().toLowerCase();
  return normalized === 'completed' || normalized === 'sale' || normalized === 'let';
};

const isValuationStatus = (status: string | null | undefined): boolean => {
  const normalized = (status ?? '').trim().toLowerCase();
  return normalized === 'valuation' || normalized === 'valuation-referral';
};

const matchesCandidate = (value: string | null | undefined, candidates: string[]): boolean => {
  const normalized = normalizeName(value);
  if (!normalized) return false;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (normalized === candidate) return true;
    if (candidate.length >= 4 && (normalized.includes(candidate) || candidate.includes(normalized))) {
      return true;
    }
  }
  return false;
};

const formatMoney = (amount: number): string => `GBP ${Math.round(amount).toLocaleString()}`;

export function MyAnalyticsView() {
  const { selectedStaffMember } = useNegotiatorStore();
  const { user } = useAuthStore();
  const { movements, dateRange, staffMembers } = useDashboardStore();

  const identityCandidates = useMemo(() => {
    const set = new Set<string>();

    const addCandidate = (value: string | null | undefined) => {
      const normalized = normalizeName(value);
      if (normalized) set.add(normalized);
    };

    addCandidate(selectedStaffMember?.name);
    addCandidate((user?.user_metadata as any)?.full_name);
    addCandidate((user?.user_metadata as any)?.name);
    addCandidate(toLocalNameFromEmail(user?.email));

    const metadataStaffId =
      (user?.user_metadata as any)?.staff_id ??
      (user?.app_metadata as any)?.staff_id ??
      null;

    if (metadataStaffId) {
      const matchedById = staffMembers.find((member) => member.id === metadataStaffId);
      if (matchedById) addCandidate(matchedById.name);
    }

    if (user?.email) {
      const normalizedEmail = user.email.trim().toLowerCase();
      const matchedByEmail = staffMembers.find(
        (member) => member.email.trim().toLowerCase() === normalizedEmail
      );
      if (matchedByEmail) addCandidate(matchedByEmail.name);
    }

    return Array.from(set);
  }, [selectedStaffMember?.name, user?.email, user?.user_metadata, user?.app_metadata, staffMembers]);

  const personalMovements = useMemo(() => {
    const fromTime = dateRange.from ? startOfDay(dateRange.from).getTime() : null;
    const toTime = dateRange.to ? endOfDay(dateRange.to).getTime() : null;

    return movements.filter((movement) => {
      const movementDate = parseDateSafe(movement.date ?? movement.createdAt);
      if (!movementDate) return false;

      const timestamp = movementDate.getTime();
      if (fromTime !== null && timestamp < fromTime) return false;
      if (toTime !== null && timestamp > toTime) return false;

      if (identityCandidates.length === 0) return true;
      return matchesCandidate(movement.agent, identityCandidates);
    });
  }, [movements, dateRange.from, dateRange.to, identityCandidates]);

  const summary = useMemo(() => {
    const totalRevenue = personalMovements.reduce(
      (sum, movement) => sum + toFiniteNumber(movement.feeAmount ?? 0),
      0
    );
    const dealsClosed = personalMovements.filter((movement) => isCompletedStatus(movement.status)).length;
    const valuations = personalMovements.filter((movement) => isValuationStatus(movement.status)).length;
    const averageDealValue = dealsClosed > 0 ? totalRevenue / dealsClosed : 0;
    const conversionRate = valuations > 0 ? (dealsClosed / valuations) * 100 : 0;

    return {
      totalRevenue,
      dealsClosed,
      valuations,
      averageDealValue,
      conversionRate,
    };
  }, [personalMovements]);

  const trendData = useMemo(() => {
    const monthly = new Map<string, { month: string; revenue: number; deals: number }>();

    for (const movement of personalMovements) {
      const movementDate = parseDateSafe(movement.date ?? movement.createdAt);
      if (!movementDate) continue;

      const key = format(movementDate, 'yyyy-MM');
      const monthLabel = format(movementDate, 'MMM yyyy');
      const existing = monthly.get(key) ?? {
        month: monthLabel,
        revenue: 0,
        deals: 0,
      };

      existing.revenue += toFiniteNumber(movement.feeAmount ?? 0);
      if (isCompletedStatus(movement.status)) {
        existing.deals += 1;
      }
      monthly.set(key, existing);
    }

    return Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => ({
        month: value.month,
        revenue: Math.round(value.revenue),
        deals: value.deals,
      }));
  }, [personalMovements]);

  const greetingName =
    selectedStaffMember?.name ??
    (user?.user_metadata as any)?.full_name ??
    (user?.user_metadata as any)?.name ??
    user?.email?.split('@')[0] ??
    'there';

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Hello {greetingName}
          </h1>
          <p className="text-muted-foreground">
            Your personal performance metrics and insights
          </p>
        </div>

        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <DownloadIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Export Report
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center">
        <DateRangePicker />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Revenue</CardTitle>
            <PoundSterlingIcon className="h-4 w-4 text-success" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatMoney(summary.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Live personal total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Deals Closed</CardTitle>
            <HomeIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.dealsClosed}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Completed sales/lets
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Avg. Deal Value</CardTitle>
            <PoundSterlingIcon className="h-4 w-4 text-tertiary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatMoney(summary.averageDealValue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Based on closed deals
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Conversion Rate</CardTitle>
            <PercentIcon className="h-4 w-4 text-warning" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.conversionRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              {summary.valuations} valuations tracked
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">My Performance Trends</CardTitle>
          <p className="text-sm text-muted-foreground">Revenue and deals over time</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
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
                  color: 'hsl(var(--card-foreground))',
                }}
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
              <Line
                type="monotone"
                dataKey="deals"
                stroke="#2E8B57"
                strokeWidth={3}
                name="Deals Closed"
                dot={{ fill: '#2E8B57', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
