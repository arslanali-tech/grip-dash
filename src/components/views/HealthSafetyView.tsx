import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createHealthSafetyItem,
  deleteHealthSafetyItem,
  fetchHealthSafetyItems,
  updateHealthSafetyItem,
  HealthSafetyItemRow,
} from '@/lib/ownerApi';
import { 
  ShieldCheckIcon, 
  SearchIcon, 
  PlusIcon, 
  FileTextIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  DownloadIcon,
  XIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/hooks/use-confirm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportInjuryDialog } from '../ReportInjuryDialog';
import { AddHealthSafetyItemDialog, AddHealthSafetyItemData } from '../AddHealthSafetyItemDialog';

interface HealthSafetyItem {
  id: string;
  title: string;
  category: 'risk-assessment' | 'incident-report' | 'training' | 'inspection' | 'policy';
  status: 'compliant' | 'pending' | 'overdue';
  dueDate?: string;
  lastUpdated: string;
  assignedTo: string;
  branch: string;
  branchId?: string | null;
}

const categoryConfig = {
  'risk-assessment': { label: 'Risk Assessment', color: 'text-blue-600', bg: 'bg-blue-100' },
  'incident-report': { label: 'Incident Report', color: 'text-red-600', bg: 'bg-red-100' },
  'training': { label: 'Training', color: 'text-purple-600', bg: 'bg-purple-100' },
  'inspection': { label: 'Inspection', color: 'text-orange-600', bg: 'bg-orange-100' },
  'policy': { label: 'Policy', color: 'text-green-600', bg: 'bg-green-100' },
};

interface HealthSafetyViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function HealthSafetyView({ agencyId, branchId, branchName }: HealthSafetyViewProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState<HealthSafetyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportIncidentOpen, setReportIncidentOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HealthSafetyItem | null>(null);

  const mapRowToItem = (row: HealthSafetyItemRow): HealthSafetyItem => ({
    id: row.id,
    title: row.title,
    category: row.category as HealthSafetyItem['category'],
    status: row.status as HealthSafetyItem['status'],
    dueDate: row.due_date ?? undefined,
    lastUpdated: row.last_updated,
    assignedTo: row.assigned_to,
    branch: row.branch,
    branchId: (row as any).branch_id ?? null,
  });

  useEffect(() => {
    const load = async () => {
      if (!agencyId) {
        setItems([]);
        return;
      }

      setLoading(true);
      const rows = await fetchHealthSafetyItems(agencyId);
      const mapped = rows.map(mapRowToItem);

      // Branch-scoping for branch managers
      const scoped = branchId
        ? mapped.filter((it) => (it.branchId ?? null) === branchId)
        : branchName
          ? mapped.filter((it) => String(it.branch ?? '').toLowerCase() === String(branchName).toLowerCase())
          : mapped;

      setItems(scoped);
      setLoading(false);
    };

    void load();
  }, [agencyId, branchId, branchName]);

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const compliantCount = items.filter(i => i.status === 'compliant').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const overdueCount = items.filter(i => i.status === 'overdue').length;

  const handleReportIncidentSave = async (data: any) => {
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const newIncident: HealthSafetyItem = {
      id: `hs${Date.now()}`,
      title: `Incident Report - ${data.injuredPerson}`,
      category: 'incident-report',
      status: 'pending',
      lastUpdated: new Date().toISOString().split('T')[0],
      assignedTo: data.reportedBy || 'Current User',
      branch: branchName ?? data.branch ?? 'Unassigned',
      branchId: branchId ?? null,
    };

    const created = await createHealthSafetyItem(agencyId, {
      title: newIncident.title,
      category: newIncident.category,
      status: newIncident.status,
      due_date: null,
      last_updated: newIncident.lastUpdated,
      assigned_to: newIncident.assignedTo,
      branch: newIncident.branch,
      details: data,
      ...(branchId ? ({ branch_id: branchId } as any) : {}),
    });

    if (!created) {
      alert('Could not save incident report.');
      return;
    }

    setItems((prev) => [mapRowToItem(created), ...prev]);
  };

  const handleAddItemSave = async (data: AddHealthSafetyItemData) => {
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const newItem: HealthSafetyItem = {
      id: `hs${Date.now()}`,
      title: data.title,
      category: data.category,
      status: data.status,
      dueDate: data.dueDate || undefined,
      lastUpdated: new Date().toISOString().split('T')[0],
      assignedTo: data.assignedTo || 'Unassigned',
      branch: branchName ?? data.branch ?? 'Unassigned',
      branchId: branchId ?? null,
    };

    const created = await createHealthSafetyItem(agencyId, {
      title: newItem.title,
      category: newItem.category,
      status: newItem.status,
      due_date: newItem.dueDate ?? null,
      last_updated: newItem.lastUpdated,
      assigned_to: newItem.assignedTo,
      branch: newItem.branch,
      details: data.details ?? null,
      ...(branchId ? ({ branch_id: branchId } as any) : {}),
    });

    if (!created) {
      alert('Could not save item.');
      return;
    }

    setItems((prev) => [mapRowToItem(created), ...prev]);
  };

  const handleEditSave = async (data: AddHealthSafetyItemData) => {
    if (!editingItem) return;
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const updatedLocal: HealthSafetyItem = {
      id: editingItem.id,
      title: data.title,
      category: data.category,
      status: data.status,
      dueDate: data.dueDate || undefined,
      lastUpdated: new Date().toISOString().split('T')[0],
      assignedTo: data.assignedTo || 'Unassigned',
      branch: branchName ?? data.branch ?? editingItem.branch,
      branchId: branchId ?? editingItem.branchId ?? null,
    };

    const updated = await updateHealthSafetyItem(editingItem.id, {
      title: updatedLocal.title,
      category: updatedLocal.category,
      status: updatedLocal.status,
      due_date: updatedLocal.dueDate ?? null,
      last_updated: updatedLocal.lastUpdated,
      assigned_to: updatedLocal.assignedTo,
      branch: updatedLocal.branch,
      details: data.details ?? null,
      ...(branchId ? ({ branch_id: branchId } as any) : {}),
    });

    if (!updated) {
      alert('Could not update item.');
      return;
    }

    setItems((prev) => prev.map((it) => (it.id === editingItem.id ? mapRowToItem(updated) : it)));
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog('Delete this item?', {
      title: 'Delete item?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    await deleteHealthSafetyItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDownload = (item: HealthSafetyItem) => {
    const data = {
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      dueDate: item.dueDate ?? null,
      lastUpdated: item.lastUpdated,
      assignedTo: item.assignedTo,
      branch: item.branch,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = item.title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40);
    a.href = url;
    a.download = `hs_${safeTitle || 'item'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      compliant: { icon: CheckCircle2Icon, color: 'text-green-700', bg: 'bg-green-100', label: 'Compliant' },
      pending: { icon: ClockIcon, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
      overdue: { icon: AlertTriangleIcon, color: 'text-red-700', bg: 'bg-red-100', label: 'Overdue' },
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
    <div className={cn("space-y-4", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Summary Cards */}
      {agencyId && loading && (
        <p className="text-sm text-muted-foreground">Loading health &amp; safety items…</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Compliant</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2Icon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{compliantCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Pending</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <ClockIcon className="h-4 w-4 text-yellow-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2 border-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">Overdue</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangleIcon className="h-4 w-4 text-red-600" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                className="pl-9 h-9 w-64 bg-background text-foreground shadow-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground h-9 w-9 shadow-sm"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddItemOpen(true)} disabled={!agencyId}>
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Add Item
          </Button>

          <Button 
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => setReportIncidentOpen(true)}
            disabled={!agencyId}
          >
            <AlertTriangleIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Report Incident
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => {
          const categoryInfo = categoryConfig[item.category];
          
          return (
            <Card
              key={item.id}
              className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", categoryInfo.bg)}>
                      <FileTextIcon className={cn("h-4 w-4", categoryInfo.color)} strokeWidth={1.5} />
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", categoryInfo.bg, categoryInfo.color)}>
                      {categoryInfo.label}
                    </span>
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
                      <DropdownMenuItem onClick={() => setEditingItem(item)}>
                        <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(item)}>
                        <DownloadIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => void handleDelete(item.id)}>
                        <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <CardTitle className="text-base font-semibold text-foreground">
                  {item.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  {getStatusBadge(item.status)}
                </div>

                {item.dueDate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className="text-foreground font-medium">
                      {new Date(item.dueDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="text-foreground font-medium">
                    {new Date(item.lastUpdated).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Assigned To</span>
                    <span className="text-foreground font-medium">{item.assignedTo}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="text-foreground font-medium">{item.branch}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <ShieldCheckIcon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
            No health & safety items found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or add a new item
          </p>
        </div>
      )}

      <ReportInjuryDialog
        open={reportIncidentOpen}
        onOpenChange={setReportIncidentOpen}
        onSave={handleReportIncidentSave}
      />

      <AddHealthSafetyItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        onSave={handleAddItemSave}
      />

      {editingItem && (
        <AddHealthSafetyItemDialog
          open={!!editingItem}
          onOpenChange={(o) => !o && setEditingItem(null)}
          onSave={handleEditSave}
          initialData={{
            title: editingItem.title,
            category: editingItem.category,
            status: editingItem.status,
            dueDate: editingItem.dueDate,
            assignedTo: editingItem.assignedTo,
            branch: editingItem.branch,
          }}
          title="Edit Health & Safety Item"
        />
      )}
    </div>
  );
}
