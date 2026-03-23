import { useEffect, useState } from 'react';
import { SearchIcon, FilterIcon, PlusIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, CalendarIcon, UserIcon, MoreHorizontalIcon, ArrowUpDownIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { parse, isPast, isFuture } from 'date-fns';
import { ComplianceTaskRow, fetchComplianceTasks, updateComplianceTask, deleteComplianceTask, createComplianceTask } from '@/lib/ownerApi';

interface ComplianceTask {
  id: string;
  type: string;
  description: string;
  reminderDate: string; // DD/MM/YY
  eventDate: string; // DD/MM/YY
  assignedTo: string;
  isCompleted: boolean;
}

const mapRowToTask = (row: ComplianceTaskRow): ComplianceTask => ({
  id: row.id,
  type: row.type,
  description: row.description,
  // store as DD/MM/YY for existing UI
  reminderDate: new Date(row.reminder_date).toLocaleDateString('en-GB').slice(0, 8),
  eventDate: new Date(row.event_date).toLocaleDateString('en-GB').slice(0, 8),
  assignedTo: row.assigned_to,
  isCompleted: row.is_completed,
});

type SortField = 'reminderDate' | 'eventDate' | 'type' | 'description' | 'assignedTo';
type SortDirection = 'asc' | 'desc';

interface ComplianceTasksListProps {
  agencyId?: string;
}

export function ComplianceTasksList({ agencyId }: ComplianceTasksListProps) {
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [viewTask, setViewTask] = useState<ComplianceTask | null>(null);
  const [newTask, setNewTask] = useState({
    type: '',
    description: '',
    reminderDate: '',
    eventDate: '',
    assignedTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('reminderDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const itemsPerPage = 10;

  useEffect(() => {
    const load = async () => {
      if (!agencyId) return;
      const rows = await fetchComplianceTasks(agencyId);
      setTasks(rows.map(mapRowToTask));
    };
    void load();
  }, [agencyId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'reminderDate':
      case 'eventDate':
        const dateA = parse(a[sortField], 'dd/MM/yy', new Date());
        const dateB = parse(b[sortField], 'dd/MM/yy', new Date());
        comparison = dateA.getTime() - dateB.getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'assignedTo':
        comparison = a.assignedTo.localeCompare(b.assignedTo);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

  const handleExportCsv = () => {
    // Export ALL filtered+sorted tasks, not just current page.
    const header = ['Type', 'Description', 'Reminder date', 'Event date', 'Assigned to', 'Completed'];
    const rows = sortedTasks.map((t) => [
      t.type,
      t.description,
      t.reminderDate,
      t.eventDate,
      t.assignedTo,
      t.isCompleted ? 'Yes' : 'No',
    ]);

    const escape = (value: string) => {
      const v = value ?? '';
      if (v.includes('"') || v.includes(',') || v.includes('\n')) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    };

    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => escape(String(c))).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date();
    const stamp = today.toISOString().slice(0, 10);
    link.download = `compliance-tasks-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    // Lightweight approach: open a printable HTML table in a new tab.
    const rowsHtml = sortedTasks
      .map(
        (t) =>
          `<tr>
<td>${t.type}</td>
<td>${t.description}</td>
<td>${t.reminderDate}</td>
<td>${t.eventDate}</td>
<td>${t.assignedTo}</td>
<td>${t.isCompleted ? 'Yes' : 'No'}</td>
</tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Compliance Tasks Export</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Compliance Tasks</h1>
  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Description</th>
        <th>Reminder date</th>
        <th>Event date</th>
        <th>Assigned to</th>
        <th>Completed</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
  };

  const handleCheckboxChange = (id: string) => {
    setTasks(prev => {
      const next = prev.map(task =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      );
      const updated = next.find(t => t.id === id);
      if (updated) {
        // fire-and-forget; errors logged in API
        void updateComplianceTask(id, { is_completed: updated.isCompleted });
      }
      return next;
    });
  };

  const handleSaveTask = async () => {
    if (!agencyId) {
      alert('No agency found for this owner yet. Try again once the agency header has loaded.');
      return;
    }
    if (!newTask.type || !newTask.description || !newTask.reminderDate || !newTask.eventDate || !newTask.assignedTo) {
      alert('Please fill in all fields for the new task.');
      return;
    }
    // convert DD/MM/YY to ISO date (YYYY-MM-DD)
    const toIso = (v: string) => {
      const [d, m, y] = v.split('/');
      const fullYear = y.length === 2 ? `20${y}` : y;
      return `${fullYear}-${m}-${d}`;
    };

    // If editing, update existing row
    if (editingTaskId) {
      const updated = await updateComplianceTask(editingTaskId, {
        type: newTask.type,
        description: newTask.description,
        reminder_date: toIso(newTask.reminderDate),
        event_date: toIso(newTask.eventDate),
        assigned_to: newTask.assignedTo,
      });

      if (!updated) {
        alert('Could not update task. Please check your Supabase logs/schema.');
        return;
      }

      setTasks(prev => prev.map(t => (t.id === editingTaskId ? mapRowToTask(updated) : t)));
    } else {
      const created = await createComplianceTask(agencyId, {
        type: newTask.type,
        description: newTask.description,
        reminder_date: toIso(newTask.reminderDate),
        event_date: toIso(newTask.eventDate),
        assigned_to: newTask.assignedTo,
      });

      if (!created) {
        alert('Could not save task. Please check your Supabase logs/schema.');
        return;
      }

      setTasks(prev => [mapRowToTask(created), ...prev]);
    }

    setIsCreating(false);
    setEditingTaskId(null);
    setNewTask({ type: '', description: '', reminderDate: '', eventDate: '', assignedTo: '' });
  };

  return (
    <div className="space-y-6 relative z-10">
      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 flex items-center gap-2">
          {/* Placeholder for left-aligned content if any */}
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search tasks..."
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

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground">
                <FilterIcon className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4 bg-popover text-popover-foreground" align="end">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Filter Options</p>
                <div className="text-muted-foreground text-xs">
                  {/* Placeholder for filter options */}
                  <p>Filter by Type</p>
                  <p>Filter by Assigned To</p>
                  <p>Filter by Date</p>
                </div>
                <Button size="sm" className="w-full">Apply Filters</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setIsCreating(true);
              setEditingTaskId(null);
              setNewTask({ type: '', description: '', reminderDate: '', eventDate: '', assignedTo: '' });
            }}
          >
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            New
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground">
                Export <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
              <DropdownMenuItem onClick={handleExportCsv}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Create Task Inline Form */}
      {isCreating && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              placeholder="Type (e.g. Tax Filing)"
              value={newTask.type}
              onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <Input
              placeholder="Reminder DD/MM/YY"
              value={newTask.reminderDate}
              onChange={(e) => setNewTask({ ...newTask, reminderDate: e.target.value })}
            />
            <Input
              placeholder="Event DD/MM/YY"
              value={newTask.eventDate}
              onChange={(e) => setNewTask({ ...newTask, eventDate: e.target.value })}
            />
            <Input
              placeholder="Assigned To"
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setEditingTaskId(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleSaveTask}>
              {editingTaskId ? 'Update Task' : 'Save Task'}
            </Button>
          </div>
        </div>
      )}

      {/* View details dialog */}
      <Dialog open={!!viewTask} onOpenChange={(open) => !open && setViewTask(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Task details</DialogTitle>
            <DialogDescription>Review the compliance task information.</DialogDescription>
          </DialogHeader>
          {viewTask && (
            <div className="space-y-3 mt-2 text-sm">
              <div>
                <span className="font-medium text-foreground">Type:</span>
                <span className="ml-2 text-muted-foreground">{viewTask.type}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Description:</span>
                <span className="ml-2 text-muted-foreground">{viewTask.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-foreground">Reminder date:</span>
                  <p className="text-muted-foreground mt-1">{viewTask.reminderDate}</p>
                </div>
                <div>
                  <span className="font-medium text-foreground">Event date:</span>
                  <p className="text-muted-foreground mt-1">{viewTask.eventDate}</p>
                </div>
              </div>
              <div>
                <span className="font-medium text-foreground">Assigned to:</span>
                <span className="ml-2 text-muted-foreground">{viewTask.assignedTo}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Completed:</span>
                <span className="ml-2 text-muted-foreground">{viewTask.isCompleted ? 'Yes' : 'No'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tasks Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[40px] text-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300" />
                </TableHead>
                <TableHead className="w-[40px] text-center"></TableHead> {/* For icon */}
                <TableHead className="text-foreground">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('type')}
                    className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Type
                    <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortField === 'type' && sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                  </Button>
                </TableHead>
                <TableHead className="text-foreground">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('description')}
                    className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Description
                    <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortField === 'description' && sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                  </Button>
                </TableHead>
                <TableHead className="text-foreground">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('reminderDate')}
                    className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Reminder date
                    <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortField === 'reminderDate' && sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                  </Button>
                </TableHead>
                <TableHead className="text-foreground">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('eventDate')}
                    className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Event date
                    <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortField === 'eventDate' && sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                  </Button>
                </TableHead>
                <TableHead className="text-foreground">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('assignedTo')}
                    className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Assigned to
                    <ArrowUpDownIcon className={cn("ml-2 h-4 w-4", sortField === 'assignedTo' && sortDirection === 'desc' ? 'rotate-180' : '')} strokeWidth={1.5} />
                  </Button>
                </TableHead>
                <TableHead className="text-right text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.map((task) => {
                const parsedReminderDate = parse(task.reminderDate, 'dd/MM/yy', new Date());
                const parsedEventDate = parse(task.eventDate, 'dd/MM/yy', new Date());

                return (
                  <TableRow key={task.id} className="hover:bg-accent/50 transition-colors duration-150">
                    <TableCell className="w-[40px] text-center">
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => handleCheckboxChange(task.id)}
                        className="form-checkbox h-4 w-4 text-primary rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="w-[40px] text-center">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </TableCell>
                    <TableCell className="text-foreground">{task.type}</TableCell>
                    <TableCell className="text-foreground">{task.description}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-block px-3 py-1 rounded-full text-xs font-medium",
                        isFuture(parsedReminderDate) && !task.isCompleted 
                          ? 'bg-red-500 text-white' 
                          : isPast(parsedReminderDate) 
                          ? 'text-muted-foreground' 
                          : 'text-foreground'
                      )}>
                        {task.reminderDate}
                      </span>
                    </TableCell>
                    <TableCell className={cn(
                      isPast(parsedEventDate) ? 'text-gray-500' : 'text-muted-foreground'
                    )}>
                      {task.eventDate}
                    </TableCell>
                    <TableCell className="text-foreground">{task.assignedTo}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            <MoreHorizontalIcon className="h-4 w-4" strokeWidth={1.5} />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                          <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            className="text-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setViewTask(task);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setIsCreating(true);
                              setEditingTaskId(task.id);
                              setNewTask({
                                type: task.type,
                                description: task.description,
                                reminderDate: task.reminderDate,
                                eventDate: task.eventDate,
                                assignedTo: task.assignedTo,
                              });
                            }}
                          >
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={async () => {
                              await deleteComplianceTask(task.id);
                              setTasks(prev => prev.filter(t => t.id !== task.id));
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Records {startIndex + 1}-{Math.min(endIndex, sortedTasks.length)} of {sortedTasks.length} records found</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
