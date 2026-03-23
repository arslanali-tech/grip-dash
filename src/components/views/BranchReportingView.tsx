import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileTextIcon, 
  DownloadIcon,
  ClockIcon,
  CheckCircle2Icon,
  MoreVerticalIcon,
  EyeIcon,
  PlusIcon,
  TrendingUpIcon,
  UsersIcon,
  PieChartIcon,
  Loader2Icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardStore, type Movement } from '@/stores/dashboardStore';

interface Report {
  id: string;
  name: string;
  type: 'sales' | 'financial' | 'performance';
  description: string;
  lastGenerated: string;
  frequency: 'weekly' | 'monthly';
  status: 'ready' | 'scheduled';
  movementCount: number;
  revenueInRange: number;
}

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildReportCsv(filtered: Movement[], reportName: string): string {
  const headers = ['Date', 'Property', 'Address', 'Type', 'Status', 'Price', 'Fee', 'Agent', 'Branch'];
  const rows = filtered.map(m => [
    m.date ?? '',
    m.property ?? '',
    m.address ?? '',
    m.type ?? '',
    m.status ?? '',
    m.price ?? '',
    m.feeAmount ?? m.feePercentage ?? '',
    m.agent ?? '',
    m.branch ?? '',
  ]);
  return [headers.map(escapeCsvCell).join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join('\n');
}

const REPORT_TYPE_CONFIG: Record<Report['type'], { icon: typeof TrendingUpIcon; color: string; bg: string }> = {
  sales: { icon: TrendingUpIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
  performance: { icon: UsersIcon, color: 'text-green-600', bg: 'bg-green-100' },
  financial: { icon: PieChartIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
};

interface BranchReportingViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function BranchReportingView({ branchId, branchName }: BranchReportingViewProps = {}) {
  const { movements, loadingMovements, dateRange } = useDashboardStore();
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [createReportName, setCreateReportName] = useState('');
  const [createReportType, setCreateReportType] = useState<Report['type']>('performance');

  const filteredMovements = useMemo(() => {
    let filtered = [...movements];
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
    return filtered;
  }, [movements, branchId, branchName, dateRange]);

  const reports = useMemo<Report[]>(() => {
    let filtered = filteredMovements;
    const lastMovementDate = filtered
      .map(m => m.date)
      .filter(Boolean)
      .map(d => new Date(d as string))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const lastGenerated = lastMovementDate ? lastMovementDate.toISOString() : new Date().toISOString();
    const hasData = filtered.length > 0;
    const revenueInRange = filtered.reduce((sum, m) => sum + (m.feeAmount ?? 0), 0);

    return [
      {
        id: 'performance-monthly',
        name: 'Monthly Branch Performance',
        type: 'performance' as const,
        description: 'Key metrics and KPI tracking for the branch',
        lastGenerated,
        frequency: 'monthly' as const,
        status: hasData ? 'ready' : 'scheduled',
        movementCount: filtered.length,
        revenueInRange,
      },
      {
        id: 'sales-weekly',
        name: 'Weekly Sales Summary',
        type: 'sales' as const,
        description: 'Sales pipeline and completed deals summary',
        lastGenerated,
        frequency: 'weekly' as const,
        status: hasData ? 'ready' : 'scheduled',
        movementCount: filtered.length,
        revenueInRange,
      },
      {
        id: 'financial-monthly',
        name: 'Financial Overview',
        type: 'financial' as const,
        description: 'Revenue breakdown based on completed deals',
        lastGenerated,
        frequency: 'monthly' as const,
        status: hasData ? 'ready' : 'scheduled',
        movementCount: filtered.length,
        revenueInRange,
      },
    ];
  }, [filteredMovements]);

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading reports...</span>
      </div>
    );
  }

  const handleGenerate = useCallback((report: Report) => {
    const csv = buildReportCsv(filteredMovements, report.name);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredMovements]);

  const handleCreateReportGenerate = useCallback(() => {
    const name = createReportName.trim() || 'Branch Report';
    const csv = buildReportCsv(filteredMovements, name);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCreateReportOpen(false);
    setCreateReportName('');
    setCreateReportType('performance');
  }, [filteredMovements, createReportName]);

  const getStatusBadge = (status: string) => {
    const config = {
      scheduled: { icon: ClockIcon, color: 'text-blue-700', bg: 'bg-blue-100', label: 'Scheduled' },
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

  const hasAnyData = reports.some(r => r.movementCount > 0);

  return (
    <div className="space-y-6">
      {!hasAnyData && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Data is filtered by the date range (top of page) and your branch. Select a date range or add movements for this branch to see reports.
        </div>
      )}
      <div className="flex justify-end">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" onClick={() => setCreateReportOpen(true)}>
          <PlusIcon className="h-5 w-5" strokeWidth={1.5} />
          Create Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id} className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-base font-semibold text-foreground">{report.name}</CardTitle>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                  <p className="text-xs font-medium text-foreground mt-1">
                    {report.movementCount} movements in range
                    {report.revenueInRange > 0 && ` • £${report.revenueInRange.toLocaleString()} revenue`}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleGenerate(report)}>
                      <DownloadIcon className="mr-2 h-4 w-4" strokeWidth={1.5} /> Generate Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPreviewReport(report)}>
                      <EyeIcon className="mr-2 h-4 w-4" strokeWidth={1.5} /> Preview
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">{report.type}</span>
                <span className="text-xs text-muted-foreground">• {report.frequency}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{report.movementCount > 0 ? 'Last activity in range' : 'No data in selected range'}</span>
                <span className="text-foreground font-medium">
                  {report.movementCount > 0
                    ? new Date(report.lastGenerated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8" onClick={() => handleGenerate(report)}>
                  <DownloadIcon className="h-3 w-3 mr-1" strokeWidth={1.5} /> Generate
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setPreviewReport(report)}>
                  <EyeIcon className="h-3 w-3 mr-1" strokeWidth={1.5} /> Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Report types</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {reports.map((report) => {
            const config = REPORT_TYPE_CONFIG[report.type];
            const Icon = config.icon;
            return (
              <Card key={report.id} className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer" onClick={() => setPreviewReport(report)}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className={cn("p-4 rounded-lg", config.bg)}>
                      <Icon className={cn("h-8 w-8", config.color)} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{report.name}</h3>
                      <p className="text-xs text-muted-foreground">{report.frequency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground">{previewReport?.name ?? 'Report preview'}</DialogTitle>
            <DialogDescription>
              Summary for current date range and branch. Data from {filteredMovements.length} movements.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Movements in range</p>
                <p className="text-xl font-semibold text-foreground">{filteredMovements.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Revenue in range</p>
                <p className="text-xl font-semibold text-foreground">£{filteredMovements.reduce((s, m) => s + (m.feeAmount ?? 0), 0).toLocaleString()}</p>
              </div>
            </div>
            {filteredMovements.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Recent movements (up to 10)</p>
                <div className="rounded border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Address</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="text-right p-2 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      {filteredMovements.slice(0, 10).map((m) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="p-2">{m.date ? new Date(m.date).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="p-2 truncate max-w-[180px]" title={m.address}>{m.address || m.property || '—'}</td>
                          <td className="p-2">{m.status ?? '—'}</td>
                          <td className="p-2 text-right">£{(m.price ?? 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewReport(null)}>Close</Button>
            {previewReport && (
              <Button className="bg-primary text-primary-foreground" onClick={() => { handleGenerate(previewReport); setPreviewReport(null); }}>
                <DownloadIcon className="h-4 w-4 mr-2" strokeWidth={1.5} /> Download CSV
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Report dialog */}
      <Dialog open={createReportOpen} onOpenChange={setCreateReportOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Report</DialogTitle>
            <DialogDescription>
              Generate a report from the current data ({filteredMovements.length} movements in range). Choose a name and type, then download as CSV.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report-name">Report name</Label>
              <Input
                id="report-name"
                value={createReportName}
                onChange={(e) => setCreateReportName(e.target.value)}
                placeholder="e.g. Q1 Branch Summary"
              />
            </div>
            <div className="grid gap-2">
              <Label>Report type</Label>
              <Select value={createReportType} onValueChange={(v: Report['type']) => setCreateReportType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateReportOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleCreateReportGenerate}>
              <DownloadIcon className="h-4 w-4 mr-2" strokeWidth={1.5} /> Generate &amp; Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
