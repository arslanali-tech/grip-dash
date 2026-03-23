import React, { useEffect, useMemo, useState } from 'react';

type CsvProspectInput = {
  added_date?: string;
  name: string;
  agency: string;
  email: string;
  phone?: string;
  address?: string;
  status?: OwnerProspectStatus;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    // Skip completely empty lines
    if (row.some((c) => c.trim() !== '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      // Escaped quote inside a quoted field
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && c === ',') {
      pushField();
      continue;
    }

    if (!inQuotes && (c === '\n' || c === '\r')) {
      // Handle CRLF
      if (c === '\r' && text[i + 1] === '\n') i++;
      pushField();
      pushRow();
      continue;
    }

    field += c;
  }

  // Flush tail
  pushField();
  pushRow();

  return rows;
}

function normalizeHeader(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

type CanonicalCsvHeader = 'added_date' | 'name' | 'agency' | 'email' | 'phone' | 'address' | 'status';

const HEADER_ALIASES: Record<string, CanonicalCsvHeader> = {
  added_date: 'added_date',
  addeddate: 'added_date',
  date: 'added_date',

  name: 'name',
  fullname: 'name',
  full_name: 'name',

  agency: 'agency',
  company: 'agency',

  email: 'email',
  mail: 'email',

  phone: 'phone',
  mobile: 'phone',
  number: 'phone',

  address: 'address',
  location: 'address',

  status: 'status',
};

function normalizeProspectStatus(raw: string | undefined): OwnerProspectStatus | undefined {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return undefined;

  const normalized = v
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  // Allow only known statuses; otherwise leave undefined (defaults to 'prospect' server-side)
  const allowed: OwnerProspectStatus[] = [
    'prospect',
    'emailed',
    'called',
    'direct-mail',
    'walked-in',
    'meeting',
    'zoom-meeting',
    'sent-order-form',
    'signed-up',
  ];

  return (allowed as string[]).includes(normalized) ? (normalized as OwnerProspectStatus) : undefined;
}

function parseOwnerProspectsCsv(text: string): { rows: CsvProspectInput[]; errors: string[] } {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: ['CSV is empty.'] };
  }

  const rawHeaders = table[0];
  const canonicalHeaders = rawHeaders.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);

  const hasRequiredHeaders =
    canonicalHeaders.includes('name') && canonicalHeaders.includes('agency') && canonicalHeaders.includes('email');

  if (!hasRequiredHeaders) {
    return {
      rows: [],
      errors: [
        'Missing required headers. Please include at least: Name, Agency, Email. Optional: Phone, Address, Status, Added Date.',
      ],
    };
  }

  const errors: string[] = [];
  const rows: CsvProspectInput[] = [];

  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    const obj: Partial<Record<CanonicalCsvHeader, string>> = {};

    for (let c = 0; c < canonicalHeaders.length; c++) {
      const key = canonicalHeaders[c];
      if (!key) continue;
      obj[key] = (r[c] ?? '').trim();
    }

    const name = (obj.name ?? '').trim();
    const agency = (obj.agency ?? '').trim();
    const email = (obj.email ?? '').trim();

    if (!name || !agency || !email) {
      errors.push(`Row ${i + 1}: missing required field(s) (name/agency/email).`);
      continue;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.push(`Row ${i + 1}: invalid email (${email}).`);
      continue;
    }

    rows.push({
      added_date: (obj.added_date ?? '').trim() || undefined,
      name,
      agency,
      email,
      phone: (obj.phone ?? '').trim() || undefined,
      address: (obj.address ?? '').trim() || undefined,
      status: normalizeProspectStatus(obj.status),
    });
  }

  return { rows, errors };
}
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SearchIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  MessageSquareIcon,
  PlusIcon,
  MoreHorizontalIcon,
  UploadCloudIcon,
  UserPlusIcon,
  FilterIcon,
  TrashIcon,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { OwnerProspectStatusBadge, OwnerProspectStatus } from '../OwnerProspectStatusBadge';
import { ProspectDetailView } from '../ProspectDetailView';
import {
  createOwnerProspect,
  deleteOwnerProspect,
  fetchOwnerProspects,
  OwnerProspectRow,
  updateOwnerProspectLastInteraction,
  updateOwnerProspectStatus,
} from '@/lib/ownerApi';
import { confirmDialog } from '@/hooks/use-confirm';
import { notifyError, notifySuccess } from '@/lib/notify';

interface Interaction {
  type: 'email' | 'call' | 'mail' | 'meeting';
  date: string;
  notes: string;
}

interface EstateAgentProspect {
  id: string;
  addedDate: string;
  name: string;
  agency: string;
  email: string;
  phone: string;
  address: string;
  status: OwnerProspectStatus;
  lastInteraction?: Interaction;
}

const mapOwnerProspectRow = (row: OwnerProspectRow): EstateAgentProspect => ({
  id: row.id,
  addedDate: row.added_date,
  name: row.name,
  agency: row.agency,
  email: row.email,
  phone: row.phone ?? '',
  address: row.address ?? '',
  status: row.status as OwnerProspectStatus,
  lastInteraction: row.last_interaction_type
    ? {
        type: row.last_interaction_type as any,
        date: row.last_interaction_date ?? '',
        notes: row.last_interaction_notes ?? '',
      }
    : undefined,
});

const interactionIcons = {
  email: MailIcon,
  call: PhoneIcon,
  mail: MessageSquareIcon, // Using MessageSquare for mail/post
  meeting: CalendarIcon,
};

const statusHoverColors: Record<OwnerProspectStatus, string> = {
  prospect: 'hover:bg-gray-100/50',
  emailed: 'hover:bg-blue-50',
  called: 'hover:bg-orange-50',
  'direct-mail': 'hover:bg-purple-50',
  'walked-in': 'hover:bg-teal-50',
  meeting: 'hover:bg-indigo-50',
  'zoom-meeting': 'hover:bg-cyan-50',
  'sent-order-form': 'hover:bg-yellow-50',
  'signed-up': 'hover:bg-green-50',
};

interface ProspectsViewProps {
  agencyId?: string;
}

export function ProspectsView({ agencyId }: ProspectsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [prospects, setProspects] = useState<EstateAgentProspect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<EstateAgentProspect | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const [addOpen, setAddOpen] = useState(false);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CsvProspectInput[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [addForm, setAddForm] = useState({
    name: '',
    agency: '',
    email: '',
    phone: '',
    address: '',
    status: 'prospect' as OwnerProspectStatus,
  });

  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionProspectId, setInteractionProspectId] = useState<string | null>(null);
  const [interactionType, setInteractionType] = useState<'email' | 'call' | 'mail' | 'meeting'>('email');
  const [interactionDate, setInteractionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [interactionNotes, setInteractionNotes] = useState('');

  useEffect(() => {
    const loadProspects = async () => {
      if (!agencyId) return;
      const rows = await fetchOwnerProspects(agencyId);
      setProspects(rows.map(mapOwnerProspectRow));
    };
    void loadProspects();
  }, [agencyId]);

  const handleStatusChange = (id: string, newStatus: OwnerProspectStatus) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    void updateOwnerProspectStatus(id, newStatus);
  };

  const allStatuses: OwnerProspectStatus[] = useMemo(
    () => [
      'prospect',
      'emailed',
      'called',
      'direct-mail',
      'walked-in',
      'meeting',
      'zoom-meeting',
      'sent-order-form',
      'signed-up',
    ],
    []
  );

  // Extract unique locations (cities from addresses) for filter
  const locations = Array.from(
    new Set(
      prospects.map((p) => {
        const parts = p.address.split(',');
        return parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
      })
    )
  ).sort();

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.agency.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesLocation = locationFilter === 'all' || p.address.includes(locationFilter);
    
    return matchesSearch && matchesStatus && matchesLocation;
  });

  const openInteraction = (prospectId: string, type: 'email' | 'call' | 'mail' | 'meeting') => {
    setInteractionProspectId(prospectId);
    setInteractionType(type);
    setInteractionDate(new Date().toISOString().slice(0, 10));
    setInteractionNotes('');
    setInteractionOpen(true);
  };

  const handleSaveInteraction = async () => {
    if (!interactionProspectId) return;

    await updateOwnerProspectLastInteraction(interactionProspectId, {
      type: interactionType,
      date: interactionDate,
      notes: interactionNotes,
    });

    setProspects((prev) =>
      prev.map((p) =>
        p.id === interactionProspectId
          ? {
              ...p,
              lastInteraction: {
                type: interactionType,
                date: interactionDate,
                notes: interactionNotes,
              },
            }
          : p
      )
    );

    setInteractionOpen(false);
    setInteractionProspectId(null);
  };

  const handleAddProspect = async () => {
    if (!agencyId) {
      notifyError('Owner agency is still loading. Please try again in a moment.');
      return;
    }
    if (!addForm.name.trim() || !addForm.agency.trim() || !addForm.email.trim()) {
      notifyError('Please fill in name, agency, and email.');
      return;
    }

    const created = await createOwnerProspect(agencyId, {
      name: addForm.name,
      agency: addForm.agency,
      email: addForm.email,
      phone: addForm.phone,
      address: addForm.address,
      status: addForm.status,
    });

    if (!created) {
      notifyError('Could not create prospect.');
      return;
    }

    setProspects((prev) => [mapOwnerProspectRow(created), ...prev]);
    setAddOpen(false);
    setAddForm({ name: '', agency: '', email: '', phone: '', address: '', status: 'prospect' });
  };

  const resetCsv = () => {
    setCsvFile(null);
    setCsvRows([]);
    setCsvErrors([]);
    setCsvImporting(false);
    setCsvProgress({ done: 0, total: 0 });
  };

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvRows([]);
    setCsvErrors([]);

    try {
      const text = await file.text();
      const parsed = parseOwnerProspectsCsv(text);
      setCsvRows(parsed.rows);
      setCsvErrors(parsed.errors);
    } catch (e) {
      setCsvErrors([`Could not read file: ${(e as Error)?.message ?? String(e)}`]);
    }
  };

  const handleImportCsv = async () => {
    if (!agencyId) {
      notifyError('Owner agency is still loading. Please try again in a moment.');
      return;
    }
    if (!csvFile) {
      notifyError('Please choose a CSV file first.');
      return;
    }
    if (csvRows.length === 0) {
      notifyError('No valid rows to import.');
      return;
    }

    setCsvImporting(true);
    setCsvProgress({ done: 0, total: csvRows.length });

    try {
      const created: OwnerProspectRow[] = [];
      let done = 0;

      for (const row of csvRows) {
        const inserted = await createOwnerProspect(agencyId, {
          added_date: row.added_date,
          name: row.name,
          agency: row.agency,
          email: row.email,
          phone: row.phone,
          address: row.address,
          status: row.status,
        });

        if (inserted) created.push(inserted);
        done += 1;
        setCsvProgress({ done, total: csvRows.length });
      }

      if (created.length > 0) {
        setProspects((prev) => [...created.map(mapOwnerProspectRow), ...prev]);
      }

      notifySuccess(`Imported ${created.length} prospect${created.length === 1 ? '' : 's'}.`);
      setCsvOpen(false);
      resetCsv();
    } finally {
      setCsvImporting(false);
    }
  };

  const handleDeleteProspect = async (id: string) => {
    const ok = await confirmDialog('Delete this prospect? This cannot be undone.', {
      title: 'Delete prospect?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteOwnerProspect(id);
    setProspects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      {selectedProspect && (
        <ProspectDetailView
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteProspect}
          onLogInteraction={openInteraction}
        />
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 w-full md:max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prospects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="called">Called</SelectItem>
                <SelectItem value="emailed">Emailed</SelectItem>
                <SelectItem value="direct-mail">Direct Mail</SelectItem>
                <SelectItem value="walked-in">Walked In</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="zoom-meeting">Zoom Meeting</SelectItem>
                <SelectItem value="sent-order-form">Sent Order Form</SelectItem>
                <SelectItem value="signed-up">Signed Up</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Prospect
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setAddOpen(true)}>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Add Manually
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCsvOpen(true)}>
              <UploadCloudIcon className="mr-2 h-4 w-4" />
              Upload CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="bg-card text-card-foreground">
        <CardContent className="p-0">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Last Interaction</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.map((prospect) => (
                  <TableRow
                    key={prospect.id}
                    className={cn('cursor-pointer transition-colors', statusHoverColors[prospect.status])}
                    onClick={() => setSelectedProspect(prospect)}
                  >
                    <TableCell className="text-muted-foreground">
                      {new Date(prospect.addedDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <OwnerProspectStatusBadge
                          status={prospect.status}
                          prospectId={prospect.id}
                          onStatusChange={handleStatusChange}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{prospect.agency}</TableCell>
                    <TableCell>{prospect.name}</TableCell>
                    <TableCell>{prospect.phone}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{prospect.address}</TableCell>
                    <TableCell>
                      {prospect.lastInteraction ? (
                        <div className="flex items-center gap-2 text-sm">
                          {React.createElement(interactionIcons[prospect.lastInteraction.type], {
                            className: 'h-4 w-4 text-muted-foreground',
                          })}
                          <span className="text-muted-foreground">{prospect.lastInteraction.date}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No interaction</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openInteraction(prospect.id, 'email')}>
                            <MailIcon className="mr-2 h-4 w-4" /> Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openInteraction(prospect.id, 'call')}>
                            <PhoneIcon className="mr-2 h-4 w-4" /> Call
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openInteraction(prospect.id, 'mail')}>
                            <MessageSquareIcon className="mr-2 h-4 w-4" /> Mail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openInteraction(prospect.id, 'meeting')}>
                            <CalendarIcon className="mr-2 h-4 w-4" /> Meeting
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProspect(prospect.id)}>
                            <TrashIcon className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredProspects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No prospects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add prospect</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>Agency</Label>
              <Input value={addForm.agency} onChange={(e) => setAddForm((p) => ({ ...p, agency: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={addForm.status} onValueChange={(v) => setAddForm((p) => ({ ...p, status: v as OwnerProspectStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Address</Label>
              <Textarea
                value={addForm.address}
                onChange={(e) => setAddForm((p) => ({ ...p, address: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleAddProspect}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={csvOpen}
        onOpenChange={(open) => {
          setCsvOpen(open);
          if (!open) resetCsv();
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Upload prospects CSV</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>CSV File</Label>
              <Input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} />
              <p className="text-xs text-muted-foreground">
                Required columns: Name, Agency, Email. Optional: Phone, Address, Status, Added Date.
              </p>
            </div>

            {csvFile && (
              <div className="text-sm text-muted-foreground">
                Selected: <span className="text-foreground">{csvFile.name}</span>
              </div>
            )}

            {csvErrors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <div className="text-sm font-medium text-destructive">CSV Issues</div>
                <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                  {csvErrors.slice(0, 8).map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                  {csvErrors.length > 8 && <li>…and {csvErrors.length - 8} more</li>}
                </ul>
              </div>
            )}

            {csvRows.length > 0 && (
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Ready to import</div>
                  <div className="text-xs text-muted-foreground">{csvRows.length} row(s)</div>
                </div>

                <div className="mt-3 grid gap-2">
                  <div className="text-xs text-muted-foreground">Preview (first 3)</div>
                  <div className="space-y-2">
                    {csvRows.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="rounded bg-muted/30 p-2 text-xs">
                        <div>
                          <span className="font-medium">{r.name}</span> — {r.agency}
                        </div>
                        <div className="text-muted-foreground">{r.email}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {csvImporting && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Importing {csvProgress.done}/{csvProgress.total}…
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCsvOpen(false)} disabled={csvImporting}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={handleImportCsv}
              disabled={csvImporting || !csvFile || csvRows.length === 0}
            >
              {csvImporting ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Log interaction</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={interactionType}
                  onValueChange={(v) => setInteractionType(v as 'email' | 'call' | 'mail' | 'meeting')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">email</SelectItem>
                    <SelectItem value="call">call</SelectItem>
                    <SelectItem value="mail">mail</SelectItem>
                    <SelectItem value="meeting">meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input type="date" value={interactionDate} onChange={(e) => setInteractionDate(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={interactionNotes} onChange={(e) => setInteractionNotes(e.target.value)} className="min-h-[120px]" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setInteractionOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleSaveInteraction}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
