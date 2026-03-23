import { useMemo } from 'react';
import { format, isValid, parseISO, startOfDay, endOfDay } from 'date-fns';
import {
  TrendingUpIcon,
  PoundSterlingIcon,
  PercentIcon,
  UsersIcon,
  DownloadIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '../DateRangePicker';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useProspectorStore } from '@/stores/prospectorStore';
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

const isMovedToValuation = (input: {
  stage?: string | null;
  movementBooked?: boolean | null;
  linkedMovementStatus?: string | null;
}): boolean => {
  const stage = (input.stage ?? '').trim().toLowerCase();
  const linkedStatus = (input.linkedMovementStatus ?? '').trim().toLowerCase();
  return stage === 'valuation' || linkedStatus === 'valuation' || !!input.movementBooked;
};

const formatMoney = (amount: number): string => `GBP ${Math.round(amount).toLocaleString()}`;

export function ProspectingAnalyticsView() {
  const { selectedStaffMember } = useProspectorStore();
  const { user } = useAuthStore();
  const { prospects, movements, dateRange, staffMembers } = useDashboardStore();

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

  const personalProspects = useMemo(() => {
    const fromTime = dateRange.from ? startOfDay(dateRange.from).getTime() : null;
    const toTime = dateRange.to ? endOfDay(dateRange.to).getTime() : null;

    return prospects.filter((prospect) => {
      const prospectDate = parseDateSafe(prospect.date);
      if (!prospectDate) return false;

      const timestamp = prospectDate.getTime();
      if (fromTime !== null && timestamp < fromTime) return false;
      if (toTime !== null && timestamp > toTime) return false;

      if (identityCandidates.length === 0) return true;
      return (
        matchesCandidate(prospect.prospector, identityCandidates) ||
        matchesCandidate(prospect.agent, identityCandidates)
      );
    });
  }, [prospects, dateRange.from, dateRange.to, identityCandidates]);

  const movementFeeById = useMemo(() => {
    const map = new Map<string, number>();
    for (const movement of movements) {
      map.set(movement.id, toFiniteNumber(movement.feeAmount ?? 0));
    }
    return map;
  }, [movements]);

  const summary = useMemo(() => {
    const totalProspects = personalProspects.length;
    const movedToValuation = personalProspects.filter((prospect) =>
      isMovedToValuation({
        stage: prospect.stage,
        movementBooked: prospect.movementBooked,
        linkedMovementStatus: prospect.linkedMovementStatus,
      })
    ).length;
    const conversionRate = totalProspects > 0 ? (movedToValuation / totalProspects) * 100 : 0;
    const totalCommission = personalProspects.reduce((sum, prospect) => {
      if (!prospect.linkedMovementId) return sum;
      return sum + (movementFeeById.get(prospect.linkedMovementId) ?? 0);
    }, 0);

    return {
      totalProspects,
      movedToValuation,
      conversionRate,
      totalCommission,
    };
  }, [personalProspects, movementFeeById]);

  const stageChartData = useMemo(() => {
    const stageBreakdown = personalProspects.reduce((acc, prospect) => {
      const key = (prospect.stage ?? 'unknown').toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(stageBreakdown).map((stage) => ({
      name: stage.replace('-', ' '),
      count: stageBreakdown[stage],
    }));
  }, [personalProspects]);

  const trendChartData = useMemo(() => {
    const monthly = new Map<string, { month: string; prospects: number; converted: number }>();

    for (const prospect of personalProspects) {
      const parsedDate = parseDateSafe(prospect.date);
      if (!parsedDate) continue;

      const key = format(parsedDate, 'yyyy-MM');
      const month = format(parsedDate, 'MMM yyyy');
      const existing = monthly.get(key) ?? { month, prospects: 0, converted: 0 };
      existing.prospects += 1;
      if (
        isMovedToValuation({
          stage: prospect.stage,
          movementBooked: prospect.movementBooked,
          linkedMovementStatus: prospect.linkedMovementStatus,
        })
      ) {
        existing.converted += 1;
      }
      monthly.set(key, existing);
    }

    return Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }, [personalProspects]);

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            My Prospecting Analytics
          </h1>
          <p className="text-muted-foreground">
            Personal prospecting performance, valuation movement, and commission.
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
            <CardTitle className="text-sm font-medium text-foreground">Total Prospects</CardTitle>
            <UsersIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.totalProspects}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Personal leads
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Moved to Valuation</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-success" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.movedToValuation}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Stage or movement linked
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Conversion Rate</CardTitle>
            <PercentIcon className="h-4 w-4 text-tertiary" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.conversionRate.toFixed(1)}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              Valuation movement ratio
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Commission</CardTitle>
            <PoundSterlingIcon className="h-4 w-4 text-warning" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatMoney(summary.totalCommission)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUpIcon className="h-3 w-3 mr-1" strokeWidth={2} />
              From linked movements
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Prospecting Trend</CardTitle>
          <p className="text-sm text-muted-foreground">New prospects and valuation movement over time</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendChartData}>
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
                dataKey="prospects"
                stroke="#4169E1"
                strokeWidth={3}
                name="New Prospects"
                dot={{ fill: '#4169E1', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="converted"
                stroke="#2E8B57"
                strokeWidth={3}
                name="Moved to Valuation"
                dot={{ fill: '#2E8B57', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Prospecting Stage Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">Distribution of your prospects by stage</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
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
              <Bar dataKey="count" fill="#4169E1" radius={[8, 8, 0, 0]} name="Prospects" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
