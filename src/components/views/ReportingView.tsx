import { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileTextIcon, 
  DownloadIcon,
  CalendarIcon,
  FilterIcon,
  PlusIcon,
  BarChart2Icon,
  PieChartIcon,
  TrendingUpIcon,
  Building2Icon,
  UsersIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  ShareIcon,
  MoreVerticalIcon,
  LayoutTemplateIcon
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DateRangePicker } from '../DateRangePicker';
import { BranchSelect } from '../BranchSelect';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboardStore';
import { createReport, getReports, deleteReport, updateReport, type ReportRow } from '@/lib/ownerApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareReportDialog } from '../ShareReportDialog';
import { ScheduleReportDialog } from '../ScheduleReportDialog';
import { CreateReportDialog, type ReportTemplate } from '../CreateReportDialog';

interface Report {
  id: string;
  name: string;
  type: 'sales' | 'financial' | 'performance' | 'custom';
  description: string;
  lastGenerated: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  status: 'scheduled' | 'generating' | 'ready';
}

const reportTemplates: Array<{
  id: string;
  name: string;
  icon: typeof TrendingUpIcon;
  color: string;
  bg: string;
  type: 'sales' | 'financial' | 'performance' | 'custom';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}> = [
  { 
    id: 't1', 
    name: 'Sales Performance Report', 
    icon: TrendingUpIcon, 
    color: 'text-blue-600', 
    bg: 'bg-blue-100',
    type: 'sales',
    description: 'Comprehensive sales metrics including deals closed, revenue generated, conversion rates, and sales trends over time.',
    frequency: 'weekly'
  },
  { 
    id: 't2', 
    name: 'Branch Comparison Report', 
    icon: Building2Icon, 
    color: 'text-purple-600', 
    bg: 'bg-purple-100',
    type: 'performance',
    description: 'Compare performance across all branches including revenue, deals, and efficiency metrics.',
    frequency: 'monthly'
  },
  { 
    id: 't3', 
    name: 'Staff Performance Report', 
    icon: UsersIcon, 
    color: 'text-green-600', 
    bg: 'bg-green-100',
    type: 'performance',
    description: 'Individual and team performance metrics including deals per agent, revenue contribution, and activity levels.',
    frequency: 'weekly'
  },
  { 
    id: 't4', 
    name: 'Financial Summary Report', 
    icon: PieChartIcon, 
    color: 'text-orange-600', 
    bg: 'bg-orange-100',
    type: 'financial',
    description: 'Financial overview including revenue, expenses, profit margins, and P&L analysis.',
    frequency: 'monthly'
  },
  { 
    id: 't5', 
    name: 'KPI Dashboard Report', 
    icon: BarChart2Icon, 
    color: 'text-cyan-600', 
    bg: 'bg-cyan-100',
    type: 'performance',
    description: 'Key performance indicators summary with targets vs actuals, trends, and alerts.',
    frequency: 'daily'
  },
  { 
    id: 't6', 
    name: 'Custom Report Builder', 
    icon: LayoutTemplateIcon, 
    color: 'text-pink-600', 
    bg: 'bg-pink-100',
    type: 'custom',
    description: 'Build your own custom report with selected metrics and visualizations.',
    frequency: 'weekly'
  },
];



export function ReportingView() {
  const isMobile = useIsMobile();
  const { filteredMovements, clientId } = useDashboardStore();
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportFormat, setReportFormat] = useState('pdf');
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [actionReport, setActionReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  // Generate dynamic reports based on actual business data
  const generatedReports = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate metrics for report descriptions
    const completedDeals = filteredMovements.filter(m => m.status === 'completed').length;
    const totalDeals = filteredMovements.length;
    const totalRevenue = filteredMovements.reduce((sum, m) => sum + (m.feeAmount || 0), 0);
    const monthlyRevenue = filteredMovements.filter(m => {
      if (!m.date) return false;
      const moveDate = new Date(m.date);
      return moveDate >= oneMonthAgo && moveDate <= now;
    }).reduce((sum, m) => sum + (m.feeAmount || 0), 0);

    const weeklyRevenue = filteredMovements.filter(m => {
      if (!m.date) return false;
      const moveDate = new Date(m.date);
      return moveDate >= oneWeekAgo && moveDate <= now;
    }).reduce((sum, m) => sum + (m.feeAmount || 0), 0);

    return [
      {
        id: 'r1',
        name: 'Monthly Sales Performance',
        type: 'sales' as const,
        description: `${completedDeals} deals closed | £${(monthlyRevenue / 1000).toFixed(0)}K revenue | ${totalDeals} total movements | This month's comprehensive sales metrics`,
        lastGenerated: now.toISOString(),
        frequency: 'monthly' as const,
        recipients: ['sarah.johnson@grip.com', 'management@grip.com'],
        status: 'ready' as const,
      },
      {
        id: 'r2',
        name: 'Weekly Branch Comparison',
        type: 'performance' as const,
        description: `Weekly performance snapshot | £${(weeklyRevenue / 1000).toFixed(0)}K revenue | ${totalDeals} total movements | Compare performance across all branches`,
        lastGenerated: now.toISOString(),
        frequency: 'weekly' as const,
        recipients: ['branch-managers@grip.com'],
        status: 'ready' as const,
      },
      {
        id: 'r3',
        name: 'Quarterly Financial Summary',
        type: 'financial' as const,
        description: `£${(totalRevenue / 1000).toFixed(0)}K total revenue | P&L analysis | Cost breakdown and profitability analysis`,
        lastGenerated: oneMonthAgo.toISOString(),
        frequency: 'quarterly' as const,
        recipients: ['finance@grip.com', 'ceo@grip.com'],
        status: 'scheduled' as const,
      },
      {
        id: 'r4',
        name: 'Daily Activity Dashboard',
        type: 'performance' as const,
        description: `Real-time snapshot of today's activities | ${filteredMovements.length} total movements | Live pipeline and appointment updates`,
        lastGenerated: now.toISOString(),
        frequency: 'daily' as const,
        recipients: ['all-staff@grip.com'],
        status: 'ready' as const,
      },
    ];
  }, [filteredMovements]);

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  };

  // Generate dynamic data from movements
  const dynamicData = useMemo(() => {
    // Sales data - monthly sales count vs target
    const monthlyMovements: { [key: string]: number } = {};
    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);

    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      monthlyMovements[monthKey] = 0;
    }

    filteredMovements.forEach(m => {
      if (!m.date) return;
      const moveDate = new Date(m.date);
      if (moveDate >= sixMonthsAgo && moveDate <= currentDate && m.status === 'completed') {
        const monthKey = moveDate.toLocaleString('en-US', { month: 'short' });
        if (monthlyMovements[monthKey] !== undefined) {
          monthlyMovements[monthKey] += 1;
        }
      }
    });

    const salesData = Object.entries(monthlyMovements).map(([month, count], index) => ({
      month,
      sales: count,
      target: Math.max(10, Math.round(count * 1.2)),
    }));

    // Branch data - revenue by branch
    const branchRevenue: { [key: string]: number } = {};
    filteredMovements.forEach(m => {
      if (m.branch && m.feeAmount) {
        branchRevenue[m.branch] = (branchRevenue[m.branch] || 0) + (m.feeAmount || 0);
      }
    });

    const branchData = Object.entries(branchRevenue)
      .map(([branch, revenue]) => ({ branch, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Status distribution - count by status
    const statusCounts: { [key: string]: number } = {
      'On Books': 0,
      'Offers': 0,
      'Sales': 0,
      'Exchanged': 0,
      'Completed': 0,
    };

    const statusColorMap: { [key: string]: string } = {
      'On Books': '#FFB800',
      'Offers': '#4169E1',
      'Sales': '#FF6347',
      'Exchanged': '#2E8B57',
      'Completed': '#9370DB',
    };

    filteredMovements.forEach(m => {
      const statusKey = m.status === 'instruction' ? 'On Books' :
        m.status === 'offer' ? 'Offers' :
        m.status === 'sale' ? 'Sales' :
        m.status === 'exchange' ? 'Exchanged' :
        m.status === 'completed' ? 'Completed' : 'On Books';
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: statusColorMap[name],
      }))
      .filter(s => s.value > 0);

    // Financial data - monthly revenue/expenses/profit for the same 6-month window
    const financialData = Object.keys(monthlyMovements).map((month, index) => {
      // determine year-month for this month label
      const dateKeys = Object.keys(monthlyMovements);
      const sampleMonthLabel = dateKeys[index];
      // find movements that match this month label
      const monthMovements = filteredMovements.filter(m => {
        if (!m.date) return false;
        const moveDate = new Date(m.date);
        const label = moveDate.toLocaleString('en-US', { month: 'short' });
        return label === month && m.status === 'completed';
      });

      const revenue = monthMovements.reduce((sum, m) => sum + (m.feeAmount || 0), 0);
      const expenses = Math.round(revenue * 0.45);
      const profit = revenue - expenses;

      return { month, revenue, expenses, profit };
    });

    // Staff performance - top agents with deals and revenue
    const agentStats: { [key: string]: { deals: number; revenue: number } } = {};
    filteredMovements.forEach(m => {
      if (m.agent && m.status === 'completed' && m.feeAmount) {
        if (!agentStats[m.agent]) {
          agentStats[m.agent] = { deals: 0, revenue: 0 };
        }
        agentStats[m.agent].deals += 1;
        agentStats[m.agent].revenue += m.feeAmount;
      }
    });

    const staffPerformanceData = Object.entries(agentStats)
      .map(([name, stats]) => ({ name: name.split(' ')[0] + ' ' + (name.split(' ')[1]?.charAt(0) || '') + '.', ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Activity data - last 7 days movement activity
    const activityData: { day: string; viewings: number; valuations: number; offers: number }[] = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(currentDate);
      dayDate.setDate(currentDate.getDate() - i);
      
      const dayMovements = filteredMovements.filter(m => {
        if (!m.date) return false;
        const moveDate = new Date(m.date);
        return moveDate.toDateString() === dayDate.toDateString();
      });

      const dayViewings = dayMovements.filter(m => m.status === 'valuation').length;
      const dayValuations = dayMovements.filter(m => m.status === 'instruction').length;
      const dayOffers = dayMovements.filter(m => m.status === 'offer').length;

      activityData.push({
        day: days[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1],
        viewings: dayViewings,
        valuations: dayValuations,
        offers: dayOffers,
      });
    }

    // Calculate period-over-period changes for financial metrics
    const totalFinRevenue = financialData.reduce((sum, m) => sum + m.revenue, 0);
    const totalFinExpenses = financialData.reduce((sum, m) => sum + m.expenses, 0);
    const totalFinProfit = financialData.reduce((sum, m) => sum + m.profit, 0);
    
    // Compare last 3 months vs previous 3 months
    const recentRevenue = financialData.slice(-3).reduce((sum, m) => sum + m.revenue, 0);
    const previousRevenue = financialData.slice(0, 3).reduce((sum, m) => sum + m.revenue, 0);
    const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const recentExpenses = financialData.slice(-3).reduce((sum, m) => sum + m.expenses, 0);
    const previousExpenses = financialData.slice(0, 3).reduce((sum, m) => sum + m.expenses, 0);
    const expenseChange = previousExpenses > 0 ? ((recentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    
    const recentProfit = financialData.slice(-3).reduce((sum, m) => sum + m.profit, 0);
    const previousProfit = financialData.slice(0, 3).reduce((sum, m) => sum + m.profit, 0);
    const profitChange = previousProfit > 0 ? ((recentProfit - previousProfit) / previousProfit) * 100 : 0;
    
    const recentMargin = recentRevenue > 0 ? (recentProfit / recentRevenue) * 100 : 0;
    const previousMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;
    const marginChange = recentMargin - previousMargin;
    
    // Activity changes (this week vs last week)
    const thisWeekActivity = activityData.slice(-3).reduce((sum, a) => sum + (a.viewings || 0), 0);
    const lastWeekActivity = activityData.slice(0, 4).reduce((sum, a) => sum + (a.viewings || 0), 0);
    const activityChange = lastWeekActivity > 0 ? ((thisWeekActivity - lastWeekActivity) / lastWeekActivity) * 100 : 0;
    
    // Sales change
    const lastMonthSales = salesData[salesData.length - 1]?.sales || 0;
    const prevMonthSales = salesData[salesData.length - 2]?.sales || 0;
    const salesChange = lastMonthSales - prevMonthSales;
    
    // Staff metrics changes
    const avgDealsPerStaff = staffPerformanceData.length > 0 
      ? staffPerformanceData.reduce((sum, s) => sum + s.deals, 0) / staffPerformanceData.length 
      : 0;
    const staffRevenueTotal = staffPerformanceData.reduce((sum, s) => sum + s.revenue, 0);
    
    return { 
      salesData, 
      branchData, 
      statusDistribution, 
      financialData, 
      staffPerformanceData, 
      activityData,
      // Financial changes
      revenueChange,
      expenseChange,
      profitChange,
      marginChange,
      // Activity changes  
      activityChange,
      salesChange,
      // Staff metrics
      avgDealsPerStaff,
      staffRevenueTotal
    };
  }, [filteredMovements]);

  // Load reports from database on mount
  useEffect(() => {
    const loadReports = async () => {
      if (!clientId) return;
      setLoading(true);
      const dbReports = await getReports(clientId);
      setReports(dbReports as Report[]);
      // Auto-select first report for preview if none selected
      if (dbReports.length > 0) {
        setPreviewReport(dbReports[0] as Report);
      }
      setLoading(false);
    };
    loadReports();
  }, [clientId]);

  // Update generated reports in database when data changes
  useEffect(() => {
    const updateGeneratedReports = async () => {
      if (!clientId || generatedReports.length === 0) return;
      
      for (const genReport of generatedReports) {
        // Update existing generated reports
        const existing = reports.find(r => r.id === genReport.id);
        if (existing && existing.status === 'ready') {
          await updateReport(genReport.id, {
            description: genReport.description,
            last_generated: new Date().toISOString(),
          });
        }
      }
    };
    
    updateGeneratedReports();
  }, [generatedReports, clientId, reports]);

  const handleGenerateReport = (reportId: string) => {
    console.log('Generating report:', reportId);
    // In real app: trigger report generation
    alert('Report generation started! You will receive an email when it\'s ready.');
  };

  const handleScheduleReport = (report: Report) => {
    setActionReport(report);
    setScheduleDialogOpen(true);
  };

  const handleShareReport = (report: Report) => {
    setActionReport(report);
    setShareDialogOpen(true);
  };

  const handlePreviewReport = (report: Report) => {
    setPreviewReport(report);
    setActiveTab('preview');
  };

  const handleUseTemplate = (template: typeof reportTemplates[0]) => {
    // Set template data to pre-fill the create dialog
    setSelectedTemplate({
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description,
      frequency: template.frequency
    });
    setCreateReportOpen(true);
  };

  const handleCreateReport = async (newReport: Report) => {
    if (!clientId) {
      alert('Error: Client ID not found. Please ensure you are logged in correctly.');
      return;
    }
    
    try {
      console.log('Creating report with clientId:', clientId);
      
      // Save to database
      const savedReport = await createReport(clientId, {
        name: newReport.name,
        type: newReport.type,
        description: newReport.description,
        frequency: newReport.frequency,
        recipients: newReport.recipients,
        status: newReport.status,
        last_generated: newReport.lastGenerated || new Date().toISOString(),
      });
      
      if (savedReport) {
        console.log('Report created successfully:', savedReport);
        // Add to local state
        setReports([...reports, savedReport as Report]);
        setPreviewReport(savedReport as Report);
        setCreateReportOpen(false);
      } else {
        console.warn('Report creation returned null');
        alert('Failed to create report: The database returned an empty response. Please check your permissions.');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create report: ${errorMessage}`);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!clientId) return;
    
    try {
      await deleteReport(reportId);
      setReports(reports.filter(r => r.id !== reportId));
      if (previewReport?.id === reportId) {
        setPreviewReport(null);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to delete report: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      scheduled: { icon: ClockIcon, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Scheduled' },
      generating: { icon: ClockIcon, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Generating' },
      ready: { icon: CheckCircle2Icon, color: 'text-green-700', bg: 'bg-green-100', label: 'Ready' },
    };
    const { icon: Icon, color, bg, label } = config[status as keyof typeof config];
    
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", bg, color)}>
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </span>
    );
  };

  return (
    <div className={cn("space-y-6", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileTextIcon className="h-8 w-8 text-green-600" strokeWidth={1.5} />
            Business Reporting
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate, schedule, and share comprehensive business reports
          </p>
        </div>

        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={() => setCreateReportOpen(true)}
        >
          <PlusIcon className="h-5 w-5" strokeWidth={1.5} />
          Create Report
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2 mb-6">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            <TabsTrigger 
              value="reports" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              My Reports
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              Live Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reports" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base font-semibold text-foreground">
                          {report.name}
                        </CardTitle>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{report.description}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleGenerateReport(report.id)}>
                          <DownloadIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Generate Now
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePreviewReport(report)}>
                          <EyeIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareReport(report)}>
                          <ShareIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleScheduleReport(report)}>
                          <ClockIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Edit Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <DownloadIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      report.type === 'sales' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      report.type === 'financial' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      report.type === 'performance' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    )}>
                      {report.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {report.frequency}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Last Generated</span>
                    <span className="text-foreground font-medium">
                      {new Date(report.lastGenerated).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Recipients</span>
                    <span className="text-foreground font-medium">{report.recipients.length} people</span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
                      onClick={() => handleGenerateReport(report.id)}
                    >
                      <DownloadIcon className="h-3 w-3 mr-1" strokeWidth={1.5} />
                      Generate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8"
                      onClick={() => handlePreviewReport(report)}
                    >
                      <EyeIcon className="h-3 w-3 mr-1" strokeWidth={1.5} />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card
                  key={template.id}
                  className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
                  onClick={() => handleUseTemplate(template)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={cn("p-4 rounded-lg", template.bg)}>
                        <Icon className={cn("h-8 w-8", template.color)} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            template.type === 'sales' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            template.type === 'financial' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            template.type === 'performance' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                            "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          )}>
                            {template.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {template.frequency}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0 space-y-6">
          {/* Live Preview */}
          <Card className="bg-card text-card-foreground border-border shadow-sm">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground text-xl">
                    {previewReport ? previewReport.name : 'Live Report Preview'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {previewReport ? previewReport.description : 'Real-time preview of your report'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {previewReport && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setPreviewReport(null);
                        setActiveTab('reports');
                      }}
                    >
                      Back to Reports
                    </Button>
                  )}
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                    <DownloadIcon className="h-4 w-4" strokeWidth={1.5} />
                    Download Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Report Header */}
              <div className="text-center pb-6 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {previewReport ? previewReport.name : 'Sales Performance Report'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Period: Last 6 Months • All Branches
                </p>
                {previewReport && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className={cn(
                      "text-xs font-medium px-3 py-1 rounded-full",
                      previewReport.type === 'sales' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      previewReport.type === 'financial' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      previewReport.type === 'performance' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    )}>
                      {previewReport.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {previewReport.frequency}
                    </span>
                    {getStatusBadge(previewReport.status)}
                  </div>
                )}
              </div>

              {/* Key Metrics Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                {previewReport?.type === 'financial' ? (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-foreground">£{(dynamicData.financialData.reduce((sum, m) => sum + m.revenue, 0) / 1000000).toFixed(2)}M</p>
                      <p className={cn("text-xs mt-1", dynamicData.revenueChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.revenueChange >= 0 ? '+' : ''}{dynamicData.revenueChange.toFixed(1)}% vs previous
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                      <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
                      <p className="text-2xl font-bold text-foreground">£{(dynamicData.financialData.reduce((sum, m) => sum + m.expenses, 0) / 1000).toFixed(0)}K</p>
                      <p className={cn("text-xs mt-1", dynamicData.expenseChange <= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.expenseChange >= 0 ? '+' : ''}{dynamicData.expenseChange.toFixed(1)}% vs previous
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                      <p className="text-2xl font-bold text-foreground">£{(dynamicData.financialData.reduce((sum, m) => sum + m.profit, 0) / 1000).toFixed(0)}K</p>
                      <p className={cn("text-xs mt-1", dynamicData.profitChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.profitChange >= 0 ? '+' : ''}{dynamicData.profitChange.toFixed(1)}% vs previous
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                      <p className="text-2xl font-bold text-foreground">{((dynamicData.financialData.reduce((sum, m) => sum + m.profit, 0) / dynamicData.financialData.reduce((sum, m) => sum + m.revenue, 0)) * 100).toFixed(1)}%</p>
                      <p className={cn("text-xs mt-1", dynamicData.marginChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.marginChange >= 0 ? '+' : ''}{dynamicData.marginChange.toFixed(1)}% vs previous
                      </p>
                    </div>
                  </>
                ) : previewReport?.type === 'performance' && !previewReport?.name.includes('Staff') ? (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground mb-1">Total Activity</p>
                      <p className="text-2xl font-bold text-foreground">{dynamicData.activityData.reduce((sum, a) => sum + (a.viewings || 0), 0)}</p>
                      <p className={cn("text-xs mt-1", dynamicData.activityChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.activityChange >= 0 ? '+' : ''}{dynamicData.activityChange.toFixed(0)}% vs last week
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-muted-foreground mb-1">Branch Count</p>
                      <p className="text-2xl font-bold text-foreground">{dynamicData.branchData.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Active branches</p>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-muted-foreground mb-1">Total Pipeline</p>
                      <p className="text-2xl font-bold text-foreground">{dynamicData.statusDistribution.reduce((sum, s) => sum + s.value, 0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Across all stages</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground mb-1">Sales This Month</p>
                      <p className="text-2xl font-bold text-foreground">{dynamicData.salesData[dynamicData.salesData.length - 1]?.sales || 0}</p>
                      <p className={cn("text-xs mt-1", dynamicData.salesChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.salesChange >= 0 ? '+' : ''}{dynamicData.salesChange} vs last month
                      </p>
                    </div>
                  </>
                ) : previewReport?.name.includes('Staff') ? (
                  <>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground mb-1">Top Performer</p>
                      <p className="text-xl font-bold text-foreground">{dynamicData.staffPerformanceData[0]?.name || 'N/A'}</p>
                      <p className="text-xs text-success mt-1">£{(dynamicData.staffPerformanceData[0]?.revenue || 0).toLocaleString()} revenue</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground mb-1">Avg Deals/Staff</p>
                      <p className="text-2xl font-bold text-foreground">{dynamicData.avgDealsPerStaff.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{dynamicData.staffPerformanceData.length} staff tracked</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-foreground">£{(dynamicData.staffRevenueTotal / 1000).toFixed(0)}K</p>
                      <p className={cn("text-xs mt-1", dynamicData.revenueChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {dynamicData.revenueChange >= 0 ? '+' : ''}{dynamicData.revenueChange.toFixed(1)}% vs previous
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-muted-foreground mb-1">Total Deals</p>
                      <p className="text-2xl font-bold text-foreground">{dynamicData.staffPerformanceData.reduce((sum, s) => sum + s.deals, 0)}</p>
                      <p className="text-xs text-muted-foreground mt-1">By top performers</p>
                    </div>
                  </>
                ) : (
                  <>
                    {(() => {
                      const totalSales = dynamicData.salesData.reduce((sum, m) => sum + m.sales, 0);
                      const last = dynamicData.salesData[dynamicData.salesData.length - 1]?.sales || 0;
                      const prev = dynamicData.salesData[dynamicData.salesData.length - 2]?.sales || 0;
                      const salesPct = pctChange(last, prev);

                      const totalRevenue = dynamicData.financialData.reduce((sum, m) => sum + m.revenue, 0);
                      const lastRev = dynamicData.financialData[dynamicData.financialData.length - 1]?.revenue || 0;
                      const prevRev = dynamicData.financialData[dynamicData.financialData.length - 2]?.revenue || 0;
                      const revPct = pctChange(lastRev, prevRev);

                      const valuations = filteredMovements.filter(m => m.status === 'valuation').length;
                      const completed = filteredMovements.filter(m => m.status === 'completed').length;
                      const conversionRate = valuations > 0 ? (completed / valuations) * 100 : 0;
                      // avg deal value
                      const avgDeal = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
                      const lastAvg = (dynamicData.financialData[dynamicData.financialData.length - 1]?.revenue || 0) / Math.max(dynamicData.salesData[dynamicData.salesData.length - 1]?.sales || 1, 1);
                      const prevAvg = (dynamicData.financialData[dynamicData.financialData.length - 2]?.revenue || 0) / Math.max(dynamicData.salesData[dynamicData.salesData.length - 2]?.sales || 1, 1);
                      const avgDealPct = pctChange(lastAvg, prevAvg);

                      return (
                        <>
                          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                            <p className="text-2xl font-bold text-foreground">{totalSales}</p>
                            <p className={"text-xs mt-1 " + (salesPct >= 0 ? 'text-success' : 'text-destructive')}>{salesPct >= 0 ? '+' : ''}{salesPct.toFixed(1)}% vs previous period</p>
                          </div>
                          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-foreground">£{(totalRevenue / 1000000).toFixed(2)}M</p>
                            <p className={"text-xs mt-1 " + (revPct >= 0 ? 'text-success' : 'text-destructive')}>{revPct >= 0 ? '+' : ''}{revPct.toFixed(1)}% vs previous period</p>
                          </div>
                          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                            <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                            <p className="text-2xl font-bold text-foreground">{conversionRate.toFixed(1)}%</p>
                            <p className={"text-xs mt-1 text-muted-foreground"}>{/* conversion change could be added here */}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                            <p className="text-xs text-muted-foreground mb-1">Avg Deal Value</p>
                            <p className="text-2xl font-bold text-foreground">£{avgDeal.toLocaleString()}</p>
                            <p className={"text-xs mt-1 " + (avgDealPct >= 0 ? 'text-success' : 'text-destructive')}>{avgDealPct >= 0 ? '+' : ''}{avgDealPct.toFixed(1)}% vs previous period</p>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* Main Chart */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">
                  {previewReport?.type === 'financial' ? 'Financial Performance' : 
                   previewReport?.name.includes('Staff') ? 'Staff Revenue Leaderboard' : 
                   previewReport?.type === 'performance' && !previewReport?.name.includes('Staff') ? 'Weekly Activity Breakdown' :
                   'Sales Performance Trend'}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  {previewReport?.type === 'financial' ? (
                    <AreaChart data={dynamicData.financialData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRevenue)" name="Revenue" />
                      <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fill="url(#colorExpenses)" name="Expenses" />
                    </AreaChart>
                  ) : previewReport?.name.includes('Staff') ? (
                    <BarChart data={dynamicData.staffPerformanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} width={100} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Revenue (£)" />
                    </BarChart>
                  ) : previewReport?.type === 'performance' && !previewReport?.name.includes('Staff') ? (
                    <BarChart data={dynamicData.activityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Legend />
                      <Bar dataKey="viewings" fill="#4169E1" radius={[4, 4, 0, 0]} name="Viewings" />
                      <Bar dataKey="valuations" fill="#9370DB" radius={[4, 4, 0, 0]} name="Valuations" />
                      <Bar dataKey="offers" fill="#FFB800" radius={[4, 4, 0, 0]} name="Offers" />
                    </BarChart>
                  ) : (
                    <LineChart data={dynamicData.salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#4169E1" strokeWidth={3} name="Actual Sales" dot={{ fill: '#4169E1', r: 4 }} />
                      <Line type="monotone" dataKey="target" stroke="#2E8B57" strokeWidth={2} strokeDasharray="5 5" name="Target" dot={{ fill: '#2E8B57', r: 3 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Secondary Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Chart */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4">
                    {previewReport?.type === 'financial' ? 'Profit Trend' : 'Branch Revenue Comparison'}
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    {previewReport?.type === 'financial' ? (
                      <BarChart data={dynamicData.financialData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                        <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Net Profit" />
                      </BarChart>
                    ) : (
                      <BarChart data={dynamicData.branchData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="branch" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} formatter={(value: number) => `£${value.toLocaleString()}`} />
                        <Bar dataKey="revenue" fill="#4169E1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Right Chart */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4">
                    {previewReport?.name.includes('Staff') ? 'Deals Closed by Staff' : 'Pipeline Status Distribution'}
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    {previewReport?.name.includes('Staff') ? (
                      <PieChart>
                        <Pie data={dynamicData.staffPerformanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="deals" nameKey="name">
                          {dynamicData.staffPerformanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#4169E1', '#9370DB', '#FFB800', '#2E8B57', '#FF6347'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                        <Legend />
                      </PieChart>
                    ) : (
                      <PieChart>
                        <Pie data={dynamicData.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                          {dynamicData.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                  {!previewReport?.name.includes('Staff') && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {dynamicData.statusDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-foreground">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Report Footer */}
              <div className="pt-6 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  This report was automatically generated by GRIP Business Intelligence
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  © 2024 GRIP. All rights reserved.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {actionReport && (
        <>
          <ShareReportDialog 
            open={shareDialogOpen} 
            onOpenChange={setShareDialogOpen} 
            reportName={actionReport.name} 
          />
          <ScheduleReportDialog 
            open={scheduleDialogOpen} 
            onOpenChange={setScheduleDialogOpen} 
            reportName={actionReport.name}
            currentFrequency={actionReport.frequency}
          />
        </>
      )}

      <CreateReportDialog 
        open={createReportOpen} 
        onOpenChange={(open) => {
          setCreateReportOpen(open);
          if (!open) setSelectedTemplate(null);
        }} 
        onSave={handleCreateReport}
        template={selectedTemplate}
      />
    </div>
  );
}
