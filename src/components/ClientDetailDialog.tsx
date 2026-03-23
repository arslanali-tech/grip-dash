import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { resolveClientEnabledModules } from '@/lib/userModules';
import {
  Building2Icon,
  FileSignatureIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogInIcon,
  MailIcon,
  MapPinIcon,
  NetworkIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  SendIcon,
  TrashIcon,
  UserIcon,
} from 'lucide-react';
import { useOwnerStore } from '@/stores/ownerStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ClientAgreementDialog } from './ClientAgreementDialog';
import { ClientInvoicesDialog } from './ClientInvoicesDialog';
import { CompanyStructureDialog } from './CompanyStructureDialog';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { useDashboardStore } from '@/stores/dashboardStore';
import {
  ClientBranchRow,
  ClientStaffRow,
  FranchiseGroupRow,
  createClientBranch,
  createClientStaffAndInvite,
  deleteClientBranch,
  deleteClientStaff,
  fetchClientsInFranchiseGroup,
  fetchFranchiseClientsForClient,
  fetchFranchiseGroupById,
  fetchClientBranches,
  fetchClientStaffForClient,
  resendClientStaffInvite,
  updateClient,
  updateClientBranch,
  updateClientStaff,
} from '@/lib/ownerApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { confirmDialog } from '@/hooks/use-confirm';
import { toast } from '@/hooks/use-toast';

interface Client {
  id: string;
  /**
   * The underlying agency row this client controls. Used for "Login as" to open
   * the main dashboard scoped to this agency.
   */
  agencyId: string;
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  address: string;
  properties: number;
  branches: number;
  package: 'Standard' | 'Pro';
  status: 'active' | 'inactive' | 'vip';
  avatar: string;
  notes?: string;
  franchiseSuperUserAccess?: boolean;
  franchiseGroupId?: string | null;
  franchiseGroupName?: string | null;
  enabledModules?: string[];
}

interface ClientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onCountsChange?: (clientId: string, counts: { branches?: number; staff?: number }) => void;
}


export function ClientDetailDialog({ open, onOpenChange, client, onCountsChange }: ClientDetailDialogProps) {
  const { setIsOpen } = useOwnerStore();
  const { setAgencyId, setClientId, setClientScopeIds, setFranchiseClients, loadMovements, loadProspects, setUserEnabledModules, setCurrentView } = useDashboardStore();
  const [showAgreement, setShowAgreement] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const [showCompanyFlow, setShowCompanyFlow] = useState(false);

  const [enabledModules, setEnabledModules] = useState<string[]>(DASHBOARD_MODULES.map((m) => m.id));
  const [savingModules, setSavingModules] = useState(false);

  const [branches, setBranches] = useState<ClientBranchRow[]>([]);
  const [staff, setStaff] = useState<ClientStaffRow[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [structureLoaded, setStructureLoaded] = useState(false);
  const [franchiseGroup, setFranchiseGroup] = useState<FranchiseGroupRow | null>(null);
  const [franchiseGroupClients, setFranchiseGroupClients] = useState<Client[]>([]);
  const [loadingFranchiseGroup, setLoadingFranchiseGroup] = useState(false);

  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    enabledModules: DASHBOARD_MODULES.map((m) => m.id),
  });
  const [addingBranch, setAddingBranch] = useState(false);

  const UNASSIGNED_BRANCH = '__unassigned__';

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: '',
    branchId: UNASSIGNED_BRANCH,
    enabledModules: DASHBOARD_MODULES.map((m) => m.id),
  });
  const [addingStaff, setAddingStaff] = useState(false);
  const [resendingInviteFor, setResendingInviteFor] = useState<string | null>(null);

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchDraft, setEditingBranchDraft] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    enabledModules: DASHBOARD_MODULES.map((m) => m.id),
  });

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffDraft, setEditingStaffDraft] = useState({
    name: '',
    email: '',
    role: '',
    branchId: UNASSIGNED_BRANCH,
    enabledModules: DASHBOARD_MODULES.map((m) => m.id),
  });

  const normalizedBranchModules = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    return DASHBOARD_MODULES.map((m) => m.id);
  };

  const normalizedStaffModules = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    return DASHBOARD_MODULES.map((m) => m.id);
  };

  const branchCount = useMemo(() => {
    if (!client) return 0;
    return structureLoaded ? branches.length : client.branches;
  }, [branches.length, client, structureLoaded]);

  useEffect(() => {
    if (!client) return;
    setEnabledModules(client.enabledModules ?? DASHBOARD_MODULES.map((m) => m.id));
  }, [client]);

  useEffect(() => {
    const loadFranchiseGroup = async () => {
      if (!open || !client?.franchiseGroupId) {
        setFranchiseGroup(null);
        setFranchiseGroupClients([]);
        return;
      }

      setLoadingFranchiseGroup(true);
      const group = await fetchFranchiseGroupById(client.franchiseGroupId);
      const groupClients = await fetchClientsInFranchiseGroup(client.franchiseGroupId);
      setFranchiseGroup(group);
      setFranchiseGroupClients(
        groupClients.map((row) => ({
          id: row.id,
          agencyId: row.agency_id,
          name: row.name,
          contactName: row.contact_name ?? undefined,
          email: row.email,
          phone: row.phone ?? '',
          address: row.address ?? '',
          properties: 0,
          branches: 0,
          package: (row.package as 'Standard' | 'Pro') ?? 'Standard',
          status: (row.status as 'active' | 'inactive' | 'vip') ?? 'active',
          avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
          notes: undefined,
          franchiseSuperUserAccess: row.franchise_super_user_access ?? false,
          franchiseGroupId: row.franchise_group_id ?? null,
          franchiseGroupName: row.franchise_group_name ?? null,
          enabledModules: (row.enabled_modules as string[]) ?? undefined,
        }))
      );
      setLoadingFranchiseGroup(false);
    };

    void loadFranchiseGroup();
  }, [client?.franchiseGroupId, open]);

  useEffect(() => {
    const loadStructure = async () => {
      if (!open || !client) return;
      setLoadingStructure(true);
      setStructureLoaded(false);
      const [b, s] = await Promise.all([fetchClientBranches(client.id), fetchClientStaffForClient(client.id)]);
      setBranches(b);
      setStaff(s);
      onCountsChange?.(client.id, { branches: b.length, staff: s.length });
      setStructureLoaded(true);
      setLoadingStructure(false);
    };

    void loadStructure();
  }, [client, open]);

  if (!client) return null;

  const handleSaveModules = async () => {
    setSavingModules(true);
    const updated = await updateClient(client.id, { enabled_modules: enabledModules });
    setSavingModules(false);

    if (!updated) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save modules for this client.',
      });
    } else {
      toast({
        title: 'Modules Saved',
        description: 'Dashboard modules saved successfully!',
      });
    }
  };

  const handleLogin = async () => {
    // "Login as client":
    // 1) Point the main dashboard store at this client's agency
    // 2) Load client's enabled modules
    // 3) Preload movements & prospects
    // 4) Set the correct initial view for the client
    // 5) Hide the Owner dashboard so the main client dashboard is shown
    try {
      if (!client?.agencyId) {
        alert('This client is missing an agency mapping.');
        return;
      }
      setAgencyId(client.agencyId);
      setClientId(client.id);
      const franchiseClients = await fetchFranchiseClientsForClient(client.id);
      const franchiseClientIds = franchiseClients.length > 0 ? franchiseClients.map((entry) => entry.id) : [client.id];
      setClientScopeIds(franchiseClientIds);
      setFranchiseClients(franchiseClients);
      
      // Load client's enabled modules from database
      const modules = await resolveClientEnabledModules(client.id);
      if (modules) {
        setUserEnabledModules(modules);
        // Navigate to the first enabled module, or 'movements' as fallback
        const firstEnabledModule = modules[0] ?? 'movements';
        setCurrentView(firstEnabledModule as any);
      } else {
        // No specific modules configured, default to movements
        setCurrentView('movements');
      }
      
      // Pass client.id to load only this client's data (data isolation)
      await Promise.all([
        loadMovements(client.agencyId, franchiseClientIds),
        loadProspects(client.agencyId, franchiseClientIds),
      ]);
      // Defensive: keep the selected client context even if any data loaders mutate store state.
      setClientId(client.id);
    } finally {
      setIsOpen(false); // Close owner dashboard to reveal main dashboard
      onOpenChange(false);
    }
  };

  const isFranchiseSuperUser = franchiseGroup?.super_user_client_id === client.id;

  const handleCreateBranch = async () => {
    if (!newBranch.name.trim()) return;
    setAddingBranch(true);
    const created = await createClientBranch(client.id, {
      name: newBranch.name,
      address: newBranch.address,
      phone: newBranch.phone,
      email: newBranch.email,
      enabled_modules: newBranch.enabledModules,
    });
    setAddingBranch(false);

    if (!created) {
      alert('Failed to create branch.');
      return;
    }

    setBranches((prev) => {
      const next = [...prev, created];
      onCountsChange?.(client.id, { branches: next.length });
      return next;
    });
    setNewBranch({
      name: '',
      address: '',
      phone: '',
      email: '',
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
    });
  };

  const handleDeleteBranch = async (branchId: string) => {
    const ok = await confirmDialog('Delete this branch?', {
      title: 'Delete branch?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteClientBranch(branchId);
    setBranches((prev) => {
      const next = prev.filter((b) => b.id !== branchId);
      onCountsChange?.(client.id, { branches: next.length });
      return next;
    });
    setStaff((prev) => prev.map((s) => (s.branch_id === branchId ? { ...s, branch_id: null } : s)));
  };

  const startEditBranch = (b: ClientBranchRow) => {
    setEditingBranchId(b.id);
    setEditingBranchDraft({
      name: b.name,
      address: b.address ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      enabledModules: normalizedBranchModules(b.enabled_modules),
    });
  };

  const cancelEditBranch = () => {
    setEditingBranchId(null);
  };

  const saveEditBranch = async (branchId: string) => {
    const updated = await updateClientBranch(branchId, {
      name: editingBranchDraft.name,
      address: editingBranchDraft.address || null,
      phone: editingBranchDraft.phone || null,
      email: editingBranchDraft.email || null,
      enabled_modules: editingBranchDraft.enabledModules,
    });

    if (!updated) {
      alert('Failed to update branch.');
      return;
    }

    setBranches((prev) => prev.map((b) => (b.id === branchId ? updated : b)));
    setEditingBranchId(null);
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;
    setAddingStaff(true);
    
    // Create staff and send invitation email
    const { staff: created, inviteSent } = await createClientStaffAndInvite(
      client.id,
      client.agencyId,
      {
        branch_id: newStaff.branchId === UNASSIGNED_BRANCH ? null : newStaff.branchId,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role || 'Staff',
        enabled_modules: newStaff.enabledModules,
      }
    );
    setAddingStaff(false);

    if (!created) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: 'Failed to create staff member.',
      });
      return;
    }

    setStaff((prev) => {
      const next = [...prev, created];
      onCountsChange?.(client.id, { staff: next.length });
      return next;
    });
    setNewStaff({
      name: '',
      email: '',
      role: '',
      branchId: UNASSIGNED_BRANCH,
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
    });

    // Show success toast with invite status
    if (inviteSent) {
      toast({
        title: 'Staff Added',
        description: `${created.name} has been added and an invitation email has been sent to ${created.email}.`,
      });
    } else {
      toast({
        title: 'Staff Added',
        description: `${created.name} has been added, but the invitation email could not be sent. You can resend it later.`,
      });
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    const ok = await confirmDialog('Delete this staff member?', {
      title: 'Delete staff member?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteClientStaff(staffId);
    setStaff((prev) => {
      const next = prev.filter((s) => s.id !== staffId);
      onCountsChange?.(client.id, { staff: next.length });
      return next;
    });
  };

  const startEditStaff = (s: ClientStaffRow) => {
    setEditingStaffId(s.id);
    setEditingStaffDraft({
      name: s.name,
      email: s.email,
      role: s.role,
      branchId: s.branch_id ?? UNASSIGNED_BRANCH,
      enabledModules: normalizedStaffModules(s.enabled_modules),
    });
  };

  const cancelEditStaff = () => {
    setEditingStaffId(null);
  };

  const saveEditStaff = async (staffId: string) => {
    const updated = await updateClientStaff(staffId, {
      name: editingStaffDraft.name,
      email: editingStaffDraft.email,
      role: editingStaffDraft.role,
      branch_id: editingStaffDraft.branchId === UNASSIGNED_BRANCH ? null : editingStaffDraft.branchId,
      enabled_modules: editingStaffDraft.enabledModules,
    });

    if (!updated) {
      alert('Failed to update staff member.');
      return;
    }

    setStaff((prev) => prev.map((s) => (s.id === staffId ? updated : s)));
    setEditingStaffId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] bg-card text-card-foreground max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b border-border flex items-start justify-between bg-muted/10">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                <AvatarImage src={client.avatar} alt={client.name} />
                <AvatarFallback className="text-lg">{client.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground">{client.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={client.status === 'active' ? 'default' : client.status === 'vip' ? 'secondary' : 'outline'} className="capitalize">
                    {client.status}
                  </Badge>
                  {client.franchiseGroupName && (
                    <Badge variant="outline" className="capitalize">
                      {client.franchiseGroupName}
                    </Badge>
                  )}
                  {isFranchiseSuperUser && (
                    <Badge variant="destructive" className="capitalize">
                      Franchise super user
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-xs gap-1.5 px-2 text-primary hover:text-primary hover:bg-primary/10 ml-2"
                    onClick={() => setShowCompanyFlow(true)}
                  >
                    <NetworkIcon className="h-3 w-3" />
                    Company Flow
                  </Button>
                  <span className="text-sm text-muted-foreground ml-1">• ID: {client.id}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setShowAgreement(true)}>
                <FileSignatureIcon className="h-4 w-4 text-blue-600" />
                Signed Agreement
              </Button>
              <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => setShowInvoices(true)}>
                <FileTextIcon className="h-4 w-4 text-green-600" />
                Client Invoices
              </Button>
            </div>
          </div>

          {(client.franchiseGroupId || client.franchiseGroupName) && (
            <div className="px-6 pt-5">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Franchise group</p>
                    <p className="text-xs opacity-80">
                      {franchiseGroup?.name ?? client.franchiseGroupName ?? 'Unresolved group'}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p>{isFranchiseSuperUser ? 'Super-user account' : 'Group member'}</p>
                    {loadingFranchiseGroup && <p>Loading members...</p>}
                  </div>
                </div>

                {franchiseGroupClients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {franchiseGroupClients.map((member) => (
                      <span
                        key={member.id}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          member.id === client.id
                            ? 'border-red-400 bg-red-100 font-medium dark:border-red-700 dark:bg-red-900/40'
                            : 'border-red-200 bg-white/70 dark:border-red-800 dark:bg-red-950/20'
                        )}
                      >
                        {member.name}
                        {franchiseGroup?.super_user_client_id === member.id ? ' (super user)' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Contact & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Main Contact</p>
                      <p className="text-sm font-medium">{client.contactName || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <MailIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <PhoneIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{client.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Location & Operations</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <MapPinIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium">{client.address}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Building2Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Branches</p>
                        <p className="text-sm font-medium">{branchCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <PackageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Package</p>
                        <p className="text-sm font-medium">{client.package}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
              <div className="p-4 rounded-lg bg-muted/30 border border-border min-h-[80px]">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {client.notes || "No notes available for this client."}
                </p>
              </div>
            </div>

            {/* Dashboard Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <LayoutDashboardIcon className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dashboard Configuration</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DASHBOARD_MODULES.map((module) => (
                  <div
                    key={module.id}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                      enabledModules.includes(module.id)
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/10 border-border opacity-60'
                    )}
                  >
                    <Checkbox
                      checked={enabledModules.includes(module.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEnabledModules((prev) => (prev.includes(module.id) ? prev : [...prev, module.id]));
                        } else {
                          setEnabledModules((prev) => prev.filter((id) => id !== module.id));
                        }
                      }}
                    />
                    <span className={cn('text-sm font-medium', enabledModules.includes(module.id) ? 'text-foreground' : 'text-muted-foreground')}>
                      {module.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveModules} disabled={savingModules} className="bg-primary text-primary-foreground">
                  {savingModules ? 'Saving…' : 'Save modules'}
                </Button>
              </div>
            </div>

            {/* Branches & Staff Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Branches</h3>
                  <span className="text-xs text-muted-foreground">{structureLoaded ? branches.length : client.branches} total</span>
                </div>

                <div className="p-4 rounded-lg bg-muted/10 border border-border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={newBranch.name} onChange={(e) => setNewBranch((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={newBranch.email} onChange={(e) => setNewBranch((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Input value={newBranch.address} onChange={(e) => setNewBranch((p) => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Phone</Label>
                      <Input value={newBranch.phone} onChange={(e) => setNewBranch((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Branch toolbar</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DASHBOARD_MODULES.map((m) => (
                        <div key={`branch-new-${m.id}`} className="flex items-center gap-2">
                          <Checkbox
                            checked={newBranch.enabledModules.includes(m.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewBranch((p) => ({ ...p, enabledModules: p.enabledModules.includes(m.id) ? p.enabledModules : [...p.enabledModules, m.id] }));
                              } else {
                                setNewBranch((p) => ({ ...p, enabledModules: p.enabledModules.filter((id) => id !== m.id) }));
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleCreateBranch} disabled={addingBranch} className="bg-primary text-primary-foreground">
                      <PlusIcon className="mr-2 h-4 w-4" /> {addingBranch ? 'Adding…' : 'Add branch'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {loadingStructure && <p className="text-xs text-muted-foreground">Loading branches…</p>}

                  {!loadingStructure && branches.length === 0 && (
                    <div className="p-4 rounded-lg border border-border bg-background text-sm text-muted-foreground">
                      No branches yet.
                    </div>
                  )}

                  <div className="space-y-2">
                    {branches.map((b) => (
                      <div key={b.id} className="p-4 rounded-lg border border-border bg-background space-y-3">
                        {editingBranchId === b.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input value={editingBranchDraft.name} onChange={(e) => setEditingBranchDraft((p) => ({ ...p, name: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Email</Label>
                                <Input value={editingBranchDraft.email} onChange={(e) => setEditingBranchDraft((p) => ({ ...p, email: e.target.value }))} />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">Address</Label>
                                <Input value={editingBranchDraft.address} onChange={(e) => setEditingBranchDraft((p) => ({ ...p, address: e.target.value }))} />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">Phone</Label>
                                <Input value={editingBranchDraft.phone} onChange={(e) => setEditingBranchDraft((p) => ({ ...p, phone: e.target.value }))} />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">Branch toolbar</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {DASHBOARD_MODULES.map((m) => (
                                  <div key={`branch-edit-${b.id}-${m.id}`} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={editingBranchDraft.enabledModules.includes(m.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setEditingBranchDraft((p) => ({
                                            ...p,
                                            enabledModules: p.enabledModules.includes(m.id) ? p.enabledModules : [...p.enabledModules, m.id],
                                          }));
                                        } else {
                                          setEditingBranchDraft((p) => ({ ...p, enabledModules: p.enabledModules.filter((id) => id !== m.id) }));
                                        }
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">{m.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelEditBranch}>
                                Cancel
                              </Button>
                              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => saveEditBranch(b.id)}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{b.name}</p>
                                <p className="text-xs text-muted-foreground">{b.address ?? 'No address'}</p>
                                <p className="text-xs text-muted-foreground">{b.email ?? ''}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => startEditBranch(b)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteBranch(b.id)}>
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Modules: {normalizedBranchModules(b.enabled_modules).length}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Staff</h3>
                  <span className="text-xs text-muted-foreground">{structureLoaded ? staff.length : '—'} total</span>
                </div>

                <div className="p-4 rounded-lg bg-muted/10 border border-border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={newStaff.name} onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={newStaff.email} onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Input value={newStaff.role} onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Branch</Label>
                      <Select value={newStaff.branchId} onValueChange={(v) => setNewStaff((p) => ({ ...p, branchId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="(optional)" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground">
                          <SelectItem value={UNASSIGNED_BRANCH}>Unassigned</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Staff toolbar</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DASHBOARD_MODULES.map((m) => (
                        <div key={`staff-new-${m.id}`} className="flex items-center gap-2">
                          <Checkbox
                            checked={newStaff.enabledModules.includes(m.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewStaff((p) => ({ ...p, enabledModules: p.enabledModules.includes(m.id) ? p.enabledModules : [...p.enabledModules, m.id] }));
                              } else {
                                setNewStaff((p) => ({ ...p, enabledModules: p.enabledModules.filter((id) => id !== m.id) }));
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleCreateStaff} disabled={addingStaff} className="bg-primary text-primary-foreground">
                      <PlusIcon className="mr-2 h-4 w-4" /> {addingStaff ? 'Adding…' : 'Add staff'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {loadingStructure && <p className="text-xs text-muted-foreground">Loading staff…</p>}

                  {!loadingStructure && staff.length === 0 && (
                    <div className="p-4 rounded-lg border border-border bg-background text-sm text-muted-foreground">
                      No staff yet.
                    </div>
                  )}

                  <div className="space-y-2">
                    {staff.map((s) => {
                      const branchName = s.branch_id ? branches.find((b) => b.id === s.branch_id)?.name : undefined;

                      return (
                        <div key={s.id} className="p-4 rounded-lg border border-border bg-background space-y-3">
                          {editingStaffId === s.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Name</Label>
                                  <Input value={editingStaffDraft.name} onChange={(e) => setEditingStaffDraft((p) => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Email</Label>
                                  <Input value={editingStaffDraft.email} onChange={(e) => setEditingStaffDraft((p) => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Role</Label>
                                  <Input value={editingStaffDraft.role} onChange={(e) => setEditingStaffDraft((p) => ({ ...p, role: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Branch</Label>
                                  <Select value={editingStaffDraft.branchId} onValueChange={(v) => setEditingStaffDraft((p) => ({ ...p, branchId: v }))}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="(optional)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover text-popover-foreground">
                                      <SelectItem value={UNASSIGNED_BRANCH}>Unassigned</SelectItem>
                                      {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Staff toolbar</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {DASHBOARD_MODULES.map((m) => (
                                    <div key={`staff-edit-${s.id}-${m.id}`} className="flex items-center gap-2">
                                      <Checkbox
                                        checked={editingStaffDraft.enabledModules.includes(m.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setEditingStaffDraft((p) => ({
                                              ...p,
                                              enabledModules: p.enabledModules.includes(m.id) ? p.enabledModules : [...p.enabledModules, m.id],
                                            }));
                                          } else {
                                            setEditingStaffDraft((p) => ({ ...p, enabledModules: p.enabledModules.filter((id) => id !== m.id) }));
                                          }
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground">{m.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={cancelEditStaff}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => saveEditStaff(s.id)}>
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-foreground">{s.name}</p>
                                  <p className="text-xs text-muted-foreground">{s.role}</p>
                                  <p className="text-xs text-muted-foreground">{s.email}</p>
                                  <p className="text-xs text-muted-foreground">{branchName ? `Branch: ${branchName}` : 'Unassigned'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                    disabled={resendingInviteFor === s.id}
                                    onClick={async () => {
                                      setResendingInviteFor(s.id);
                                      const success = await resendClientStaffInvite(s, client.agencyId);
                                      setResendingInviteFor(null);
                                      if (success) {
                                        toast({
                                          title: 'Invite Sent',
                                          description: `Invitation email sent to ${s.email}.`,
                                        });
                                      } else {
                                        toast({
                                          variant: 'destructive',
                                          title: 'Failed',
                                          description: 'Could not send invitation email. Please try again.',
                                        });
                                      }
                                    }}
                                  >
                                    <SendIcon className="h-3.5 w-3.5" />
                                    {resendingInviteFor === s.id ? 'Sending…' : 'Invite'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => startEditStaff(s)}>
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteStaff(s.id)}>
                                    <TrashIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">Modules: {normalizedStaffModules(s.enabled_modules).length}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
            <Button onClick={handleLogin} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
            <LogInIcon className="mr-2 h-4 w-4" />
            Login as {client.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <ClientAgreementDialog 
      open={showAgreement} 
      onOpenChange={setShowAgreement} 
      clientName={client.name} 
    />

    <ClientInvoicesDialog 
      open={showInvoices} 
      onOpenChange={setShowInvoices} 
      clientId={client.id}
      clientName={client.name} 
    />

    <CompanyStructureDialog
      open={showCompanyFlow}
      onOpenChange={setShowCompanyFlow}
      clientName={client.name}
      branches={branches}
      staff={staff}
    />
    </>
  );
}
