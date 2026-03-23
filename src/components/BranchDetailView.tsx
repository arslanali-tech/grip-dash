import { useEffect, useMemo, useState } from 'react';
import {
  XIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  UsersIcon,
  HomeIcon,
  PoundSterlingIcon,
  EditIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  BarChart3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  TargetIcon,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { BranchAppraisalDialog } from './BranchAppraisalDialog';
import { EditBranchDialog } from './EditBranchDialog';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { fetchStaffMembers, fetchClientStaffForClient, type StaffMemberRow, type ClientStaffRow } from '@/lib/ownerApi';

const DEFAULT_ENABLED_MODULES = DASHBOARD_MODULES.map((m) => m.id);

type BranchStatus = 'active' | 'inactive';

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  manager: string;
  teamSize: number;
  activeListings: number;
  totalSales: number;
  phone: string;
  email: string;
  status?: BranchStatus;
  enabledModules?: string[];
}

interface BranchDetailViewProps {
  branch: Branch;
  agencyId?: string;
  clientId?: string;
  onClose: () => void;
  onUpdateBranch?: (updated: Branch) => void;
}

const mockPerformanceData = [
  { month: 'Jul', sales: 12, lettings: 8, revenue: 185000 },
  { month: 'Aug', sales: 15, lettings: 10, revenue: 195000 },
  { month: 'Sep', sales: 13, lettings: 9, revenue: 210000 },
  { month: 'Oct', sales: 16, lettings: 11, revenue: 225000 },
  { month: 'Nov', sales: 14, lettings: 10, revenue: 240000 },
  { month: 'Dec', sales: 18, lettings: 12, revenue: 235000 },
];

const mockStaffPerformance = [
  { name: 'Sarah Johnson', deals: 45, revenue: 520000 },
  { name: 'Michael Brown', deals: 32, revenue: 380000 },
  { name: 'Emma Wilson', deals: 38, revenue: 425000 },
  { name: 'David Lee', deals: 28, revenue: 310000 },
];

const mockAnalyticsData = {
  kpis: [
    { label: 'Conversion Rate', value: '68%', change: 5.2, trend: 'up' },
    { label: 'Avg Days to Sale', value: '45', change: -8.1, trend: 'down' },
    { label: 'Customer Satisfaction', value: '4.7/5', change: 0.3, trend: 'up' },
    { label: 'Lead Response Time', value: '2.3h', change: -15.0, trend: 'down' },
  ],
  revenueByMonth: [
    { month: 'Jan', target: 200000, actual: 185000 },
    { month: 'Feb', target: 200000, actual: 210000 },
    { month: 'Mar', target: 220000, actual: 195000 },
    { month: 'Apr', target: 220000, actual: 240000 },
    { month: 'May', target: 250000, actual: 235000 },
    { month: 'Jun', target: 250000, actual: 265000 },
  ],
};

type StaffListItem = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
};

export function BranchDetailView({ branch, agencyId, clientId, onClose, onUpdateBranch }: BranchDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'staff' | 'modules' | 'performance' | 'analytics'>('info');
  const [branchAppraisalOpen, setBranchAppraisalOpen] = useState(false);
  const [editBranchOpen, setEditBranchOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch>(branch);
  const currentMonthYearLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const [enabledModulesDraft, setEnabledModulesDraft] = useState<string[]>(
    branch.enabledModules ?? DEFAULT_ENABLED_MODULES
  );

  const [staffRows, setStaffRows] = useState<StaffListItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    setCurrentBranch(branch);
    setEnabledModulesDraft(branch.enabledModules ?? DEFAULT_ENABLED_MODULES);
    setActiveTab('info');
  }, [branch.id]);

  useEffect(() => {
    const loadStaff = async () => {
      setLoadingStaff(true);

      // Client mode: fetch from client_staff table, filter by branch_id
      if (clientId) {
        const all = await fetchClientStaffForClient(clientId);
        const filtered = all
          .filter((row: ClientStaffRow) => row.branch_id === currentBranch.id)
          .map((row: ClientStaffRow) => ({
            id: row.id,
            name: row.name,
            role: row.role,
            email: row.email,
            status: 'active',
          }));
        setStaffRows(filtered);
        setLoadingStaff(false);
        return;
      }

      // Agency mode: fetch from staff_members table, filter by branch_name
      if (!agencyId) {
        setStaffRows([]);
        setLoadingStaff(false);
        return;
      }

      const all = await fetchStaffMembers(agencyId);
      const filtered = all
        .filter((s) => s.branch_name === currentBranch.name)
        .map((row: StaffMemberRow) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          email: row.email,
          status: row.status,
        }));

      setStaffRows(filtered);
      setLoadingStaff(false);
    };

    void loadStaff();
  }, [agencyId, clientId, currentBranch.id, currentBranch.name]);

  const resolvedBranchStatus: BranchStatus = (currentBranch.status ?? 'active') as BranchStatus;

  const displayStaff = useMemo(() => {
    if (agencyId || clientId) return staffRows;
    return mockStaffPerformance.map((s, idx) => ({
      id: `mock-${idx}`,
      name: s.name,
      role: 'Staff',
      email: '',
      status: 'active',
    }));
  }, [agencyId, clientId, staffRows]);

  const handleSaveAppraisal = (data: any) => {
    console.log('Branch Appraisal saved:', data);
    // In real app: save to backend
  };

  const handleSaveBranch = (updatedBranch: Branch) => {
    setCurrentBranch(updatedBranch);
    onUpdateBranch?.(updatedBranch);
  };

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    setEnabledModulesDraft((prev) => {
      const set = new Set(prev);
      if (checked) {
        set.add(moduleId);
      } else {
        set.delete(moduleId);
      }
      return Array.from(set);
    });
  };

  const handleSaveModules = () => {
    handleSaveBranch({
      ...currentBranch,
      enabledModules: enabledModulesDraft,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-card px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <HomeIcon className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{currentBranch.name}</h1>
                <p className="text-sm text-muted-foreground">{currentBranch.city}</p>
                <p className={cn('mt-1 text-xs', resolvedBranchStatus === 'inactive' ? 'text-destructive' : 'text-muted-foreground')}>
                  Status: {resolvedBranchStatus}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-border hover:bg-accent hover:text-accent-foreground"
                onClick={() => setEditBranchOpen(true)}
              >
                <EditIcon className="h-4 w-4" strokeWidth={1.5} />
                Edit Branch
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setBranchAppraisalOpen(true)}
              >
                <ClipboardCheckIcon className="h-4 w-4" strokeWidth={1.5} />
                Branch Appraisal
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-accent">
                <XIcon className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          {/* Branch Info Bar */}
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Manager</p>
              <p className="font-medium text-foreground">{currentBranch.manager}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Team Size</p>
              <p className="font-medium text-foreground">{currentBranch.teamSize} members</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Active Listings</p>
              <p className="font-medium text-foreground">{currentBranch.activeListings}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Total Sales</p>
              <p className="font-medium text-success">£{(currentBranch.totalSales / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 bg-background px-6 py-3">
              <div className="mb-4 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="mr-2 text-sm text-muted-foreground">Period:</span>

                <Select defaultValue="month">
                  <SelectTrigger className="h-9 w-[180px] border-border bg-background text-foreground">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="last-quarter">Last Quarter</SelectItem>
                    <SelectItem value="current-quarter">Current Quarter</SelectItem>
                    <SelectItem value="year-to-date">Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                <span className="text-sm text-muted-foreground">{currentMonthYearLabel}</span>
              </div>

              <TabsList className="h-auto gap-2 border-0 bg-transparent p-0">
                <TabsTrigger
                  value="info"
                  className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Info
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="modules"
                  className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Enabled modules
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Performance
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {/* Info */}
              <TabsContent value="info" className="mt-0 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-card text-card-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-foreground">Active Listings</CardTitle>
                      <HomeIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{currentBranch.activeListings}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card text-card-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-foreground">Team Members</CardTitle>
                      <UsersIcon className="h-4 w-4 text-tertiary" strokeWidth={1.5} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{currentBranch.teamSize}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card text-card-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-foreground">Revenue</CardTitle>
                      <PoundSterlingIcon className="h-4 w-4 text-success" strokeWidth={1.5} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">£{(currentBranch.totalSales / 1000000).toFixed(1)}M</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="text-foreground">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="mt-0.5 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                      <div>
                        <p className="font-medium text-foreground">{currentBranch.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {currentBranch.city}, {currentBranch.postcode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <PhoneIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                      <a href={`tel:${currentBranch.phone}`} className="text-primary hover:underline">
                        {currentBranch.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-3">
                      <MailIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                      <a href={`mailto:${currentBranch.email}`} className="text-primary hover:underline">
                        {currentBranch.email}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Staff */}
              <TabsContent value="staff" className="mt-0 space-y-4">
                {(agencyId || clientId) && loadingStaff && (
                  <p className="text-sm text-muted-foreground">Loading staff…</p>
                )}

                {!agencyId && !clientId && (
                  <p className="text-xs text-muted-foreground">
                    Showing demo staff (no agencyId provided).
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  {displayStaff.map((s) => (
                    <Card key={s.id} className="bg-card text-card-foreground">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.role}</p>
                            {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground">{s.status}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {displayStaff.length === 0 && !loadingStaff && (
                  <p className="text-sm text-muted-foreground">No staff found for this branch.</p>
                )}
              </TabsContent>

              {/* Enabled modules */}
              <TabsContent value="modules" className="mt-0 space-y-4">
                <Card className="bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="text-foreground">Enabled modules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {DASHBOARD_MODULES.map((m) => {
                        const checked = enabledModulesDraft.includes(m.id);
                        return (
                          <label key={m.id} className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => handleToggleModule(m.id, v === true)}
                            />
                            <span className="text-sm font-medium text-foreground">{m.label}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{m.id}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button onClick={handleSaveModules} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Save changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance */}
              <TabsContent value="performance" className="mt-0 space-y-6">
                <Card className="bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="text-foreground">6-Month Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mockPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="sales" stroke="#4169E1" strokeWidth={3} name="Sales" />
                        <Line type="monotone" dataKey="lettings" stroke="#9370DB" strokeWidth={3} name="Lettings" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="text-foreground">Team Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={mockStaffPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--muted-foreground))"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="deals" fill="#4169E1" name="Deals" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics */}
              <TabsContent value="analytics" className="mt-0 space-y-6">
                {/* KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {mockAnalyticsData.kpis.map((kpi, index) => (
                    <Card key={index} className="bg-card text-card-foreground">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                          </div>
                          <div className={`flex items-center gap-1 text-xs font-medium ${
                            kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {kpi.trend === 'up' ? (
                              <ArrowUpIcon className="h-3 w-3" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3" />
                            )}
                            {Math.abs(kpi.change)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Revenue vs Target */}
                <Card className="bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <TargetIcon className="h-5 w-5 text-primary" />
                      Revenue vs Target
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={mockAnalyticsData.revenueByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => `£${(value / 1000).toFixed(0)}k`}
                        />
                        <Legend />
                        <Bar dataKey="target" fill="#E5E7EB" name="Target" />
                        <Bar dataKey="actual" fill="#4169E1" name="Actual" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Branch Health Score */}
                <Card className="bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <BarChart3Icon className="h-5 w-5 text-primary" />
                      Branch Health Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">Financial Health</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">92%</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Excellent</p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Operational Efficiency</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">85%</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Good</p>
                      </div>
                      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Team Performance</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">88%</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Very Good</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <BranchAppraisalDialog
          open={branchAppraisalOpen}
          onOpenChange={setBranchAppraisalOpen}
          branchName={currentBranch.name}
          onSave={handleSaveAppraisal}
        />

        <EditBranchDialog open={editBranchOpen} onOpenChange={setEditBranchOpen} branch={currentBranch} onSave={handleSaveBranch} />
      </div>
    </div>
  );
}
