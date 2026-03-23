import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UsersIcon, MailIcon, PhoneIcon, PlusIcon, SearchIcon, XIcon, MoreVerticalIcon, EditIcon, TrashIcon, LayoutGridIcon, ListIcon, HomeIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, LayoutDashboardIcon, MapPinIcon, BriefcaseIcon, UserIcon, Loader2Icon, CheckIcon, FileTextIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Building2Icon, PackageIcon } from 'lucide-react'; // Import new icons
import { ClientDetailDialog } from '../ClientDetailDialog';
import { SendAgreementDialog } from '../SendAgreementDialog';
import {
  ClientBranchRow,
  FranchiseGroupRow,
  ClientRow,
  createClientBranch,
  createClientForAgency,
  createClientStaff,
  deleteClient,
  fetchClientBranches,
  fetchClientStaffForClient,
  fetchClientStaffRoles,
  fetchClientsForAgency,
  fetchFranchiseGroupsForAgency,
  inviteUserByEmail,
  updateClient,
  updateClientBranch,
  upsertClientStaffRole,
} from '@/lib/ownerApi';
import { DASHBOARD_MODULES } from '@/lib/dashboardModules';
import { useToast } from '@/hooks/use-toast';
import { confirmDialog } from '@/hooks/use-confirm';
import { STAFF_ROLE_OPTIONS } from '@/lib/staffRoles';

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
  staffCount: number;
  package: 'Standard' | 'Pro';
  status: 'active' | 'inactive' | 'vip';
  avatar: string;
  franchiseSuperUserAccess?: boolean;
  franchiseGroupId?: string | null;
  franchiseGroupName?: string;
  enabledModules?: string[];
}


const mapClientRowToClient = (row: ClientRow, branchCount = 0, staffCount = 0): Client => ({
  id: row.id,
  agencyId: row.agency_id,
  name: row.name,
  contactName: row.contact_name ?? undefined,
  email: row.email,
  phone: row.phone ?? '',
  address: row.address ?? '',
  properties: 0,
  branches: branchCount,
  staffCount,
  package: (row.package as 'Standard' | 'Pro') ?? 'Standard',
  status: (row.status as 'active' | 'inactive' | 'vip') ?? 'active',
  avatar: 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
  franchiseSuperUserAccess: row.franchise_super_user_access ?? false,
  franchiseGroupId: row.franchise_group_id ?? null,
  franchiseGroupName: row.franchise_group_name ?? undefined,
  enabledModules: (row.enabled_modules as string[]) ?? undefined,
});
type ViewMode = 'grid' | 'list';

const statusColors = {
  active: 'bg-success',
  inactive: 'bg-muted',
  vip: 'bg-warning'
};

interface ClientsViewProps {
  agencyId?: string;
}

export function ClientsView({ agencyId }: ClientsViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientsLoadError, setClientsLoadError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchOpen, setSearchOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [clientToView, setClientToView] = useState<Client | null>(null);
  const [sendAgreementOpen, setSendAgreementOpen] = useState(false);
  const [clientToSendAgreement, setClientToSendAgreement] = useState<Client | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [franchiseGroups, setFranchiseGroups] = useState<FranchiseGroupRow[]>([]);
  const [newClientData, setNewClientData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    branches: '',
    package: 'Standard' as 'Standard' | 'Pro', // Default package
    notes: '',
    franchiseSuperUserAccess: false,
    franchiseGroupId: '',
    franchiseGroupName: '',
    enabledModules: DASHBOARD_MODULES.map((m) => m.id), // Default all enabled
  });

  // Controls whether the "Number of Branches" field follows the Branches tab list.
  // If the user types a value manually, we stop auto-sync until they clear the field.
  const [branchesCountMode, setBranchesCountMode] = useState<'auto' | 'manual'>('auto');

  // State for new branches and staff within the dialog
  const [newBranches, setNewBranches] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState<any[]>([]);

  // Reusable role templates (role -> enabled modules) for client staff (when editing an existing client)
  const [staffRoleTemplates, setStaffRoleTemplates] = useState<
    { name: string; enabledModules: string[] }[]
  >([]);

  // When editing an existing client, treat their current branch/staff counts as the baseline
  // and only allow adding up to the configured "Number of Branches".
  const [editingBaseCounts, setEditingBaseCounts] = useState({ branches: 0, staff: 0 });
  // Track existing branches (DB records) when editing so we can fill in placeholder details
  const [existingBranches, setExistingBranches] = useState<ClientBranchRow[]>([]);
  // Temporary state for the branch/staff being added
  const [tempBranch, setTempBranch] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    enabledModules: DASHBOARD_MODULES.map((m) => m.id),
    editingId: null as string | null, // Track which existing branch is being edited
  });
  
  const [tempStaff, setTempStaff] = useState({
    name: '',
    email: '',
    role: '',
    customRole: '',
    branchId: '',
    enabledModules: DASHBOARD_MODULES.map((m) => m.id),
  });

  const allModuleIds = useMemo(() => DASHBOARD_MODULES.map((m) => m.id), []);

  const allowedClientModuleIds = useMemo(() => {
    const configured = Array.isArray(newClientData.enabledModules) ? newClientData.enabledModules : [];
    const set = new Set(configured);
    return allModuleIds.filter((id) => set.has(id));
  }, [allModuleIds, newClientData.enabledModules]);

  const allowedClientModuleIdSet = useMemo(
    () => new Set(allowedClientModuleIds),
    [allowedClientModuleIds]
  );

  const resolveTempStaffRoleName = () => {
    if (tempStaff.role === '__custom__') return tempStaff.customRole.trim();
    return tempStaff.role.trim();
  };

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Check if form has required fields filled
  const isFormValid = newClientData.name.trim() !== '' && newClientData.email.trim() !== '';

  const canAddTempBranch = tempBranch.name.trim() !== '';
  const canAddTempStaff =
    tempStaff.name.trim() !== '' &&
    tempStaff.email.trim() !== '' &&
    resolveTempStaffRoleName() !== '';

  // All branches that staff can be assigned to (existing + newly added in this modal).
  const staffAssignableBranches = [...existingBranches, ...newBranches];

  // Keep "Number of Branches" in sync with the branch cards count (when in auto mode).
  useEffect(() => {
    if (editingClientId) return;
    if (branchesCountMode !== 'auto') return;

    const next = newBranches.length;
    setNewClientData((prev) => ({
      ...prev,
      branches: next === 0 ? '' : String(next),
    }));
  }, [newBranches.length, branchesCountMode, editingClientId]);

  // Keep branch/staff module selections constrained to the client's enabled modules.
  useEffect(() => {
    const allowed = allowedClientModuleIds;
    const allowedSet = allowedClientModuleIdSet;

    setTempBranch((prev) => {
      const current = Array.isArray(prev.enabledModules) ? prev.enabledModules : [];
      const filtered = current.filter((id) => allowedSet.has(id));
      const isAllModulesDefault =
        current.length === allModuleIds.length && allModuleIds.every((id) => current.includes(id));
      const nextEnabled = isAllModulesDefault || filtered.length === 0 ? allowed : filtered;
      return { ...prev, enabledModules: nextEnabled };
    });

    setTempStaff((prev) => {
      const current = Array.isArray(prev.enabledModules) ? prev.enabledModules : [];
      const filtered = current.filter((id) => allowedSet.has(id));
      const isAllModulesDefault =
        current.length === allModuleIds.length && allModuleIds.every((id) => current.includes(id));
      const nextEnabled = isAllModulesDefault || filtered.length === 0 ? allowed : filtered;
      return { ...prev, enabledModules: nextEnabled };
    });

    setNewBranches((prev) =>
      prev.map((b: any) => {
        const current = Array.isArray(b.enabledModules) ? b.enabledModules : [];
        const filtered = current.filter((id: string) => allowedSet.has(id));
        const isAllModulesDefault =
          current.length === allModuleIds.length && allModuleIds.every((id) => current.includes(id));
        const nextEnabled = isAllModulesDefault || filtered.length === 0 ? allowed : filtered;
        return { ...b, enabledModules: nextEnabled };
      })
    );

    setNewStaff((prev) =>
      prev.map((s: any) => {
        const current = Array.isArray(s.enabledModules) ? s.enabledModules : [];
        const filtered = current.filter((id: string) => allowedSet.has(id));
        const isAllModulesDefault =
          current.length === allModuleIds.length && allModuleIds.every((id) => current.includes(id));
        const nextEnabled = isAllModulesDefault || filtered.length === 0 ? allowed : filtered;
        return { ...s, enabledModules: nextEnabled };
      })
    );
  }, [allowedClientModuleIds, allowedClientModuleIdSet, allModuleIds]);

  useEffect(() => {
    const loadClients = async () => {
      if (!agencyId) return;

      setIsLoadingClients(true);
      setClientsLoadError(null);

      try {
        const rows = await fetchClientsForAgency(agencyId);

        // For each client, also load branch + staff counts.
        const clientsWithCounts = await Promise.all(
          rows.map(async (row) => {
            const [branches, staff] = await Promise.all([
              fetchClientBranches(row.id),
              fetchClientStaffForClient(row.id),
            ]);
            return mapClientRowToClient(row, branches.length, staff.length);
          })
        );

        setClients(clientsWithCounts);
      } catch (e) {
        console.error('Error loading clients', e);
        setClients([]);
        setClientsLoadError('Could not load clients. Please refresh and try again.');
      } finally {
        setIsLoadingClients(false);
      }
    };
    void loadClients();
  }, [agencyId]);

  useEffect(() => {
    const loadFranchiseGroups = async () => {
      if (!agencyId) {
        setFranchiseGroups([]);
        return;
      }

      const groups = await fetchFranchiseGroupsForAgency(agencyId);
      setFranchiseGroups(groups);
    };

    void loadFranchiseGroups();
  }, [agencyId]);

  const desiredBranchesCount = Math.max(0, Number.parseInt(newClientData.branches || '0', 10) || 0);
  const effectiveBranchLimit = desiredBranchesCount > 0 ? desiredBranchesCount : Number.POSITIVE_INFINITY;
  const baseBranchesCount = editingClientId ? editingBaseCounts.branches : 0;
  const plannedBranchesCount = baseBranchesCount + newBranches.length;
  const canAddMoreBranches = plannedBranchesCount < effectiveBranchLimit;

  const handleAddBranch = async () => {
    if (!canAddTempBranch) return;
    
    // If editing an existing branch, update it
    if (tempBranch.editingId) {
      const updated = await updateClientBranch(tempBranch.editingId, {
        name: tempBranch.name,
        address: tempBranch.address || null,
        phone: tempBranch.phone || null,
        email: tempBranch.email || null,
        enabled_modules: tempBranch.enabledModules,
      });
      
      if (updated) {
        // Refresh existing branches list
        setExistingBranches(prev => 
          prev.map(b => b.id === tempBranch.editingId ? updated : b)
        );
        toast({
          title: 'Branch Updated',
          description: `${tempBranch.name} has been updated successfully.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not update branch. Please try again.',
        });
      }
      
      // Clear the form
      setTempBranch({
        name: '',
        address: '',
        phone: '',
        email: '',
        enabledModules: DASHBOARD_MODULES.map((m) => m.id),
        editingId: null,
      });
      return;
    }
    
    // Otherwise, add a new branch
    if (!canAddMoreBranches) return;
    setNewBranches([...newBranches, { ...tempBranch, id: `temp-branch-${Date.now()}` }]);
    setTempBranch({
      name: '',
      address: '',
      phone: '',
      email: '',
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
      editingId: null,
    });
  };

  const handleAddStaff = () => {
    // Allow adding staff even if no branch is selected (branch assignment is optional).
    if (!canAddTempStaff) return;
    setNewStaff([...newStaff, { ...tempStaff, id: `temp-staff-${Date.now()}` }]);
    setTempStaff({
      name: '',
      email: '',
      role: '',
      branchId: '',
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
    });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = client.status === 'active' || client.status === 'vip';
    } else if (statusFilter === 'inactive') {
      matchesStatus = client.status === 'inactive';
    }

    return matchesSearch && matchesStatus;
  });

  const resetClientForm = () => {
    setEditingClientId(null);
    setEditingBaseCounts({ branches: 0, staff: 0 });
    setExistingBranches([]);
    setStaffRoleTemplates([]);
    setNewClientData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      branches: '',
      package: 'Standard',
      notes: '',
      franchiseSuperUserAccess: false,
      franchiseGroupId: '',
      franchiseGroupName: '',
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
    });
    setBranchesCountMode('auto');
    setNewBranches([]);
    setNewStaff([]);
    setTempBranch({
      name: '',
      address: '',
      phone: '',
      email: '',
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
      editingId: null,
    });
    setTempStaff({
      name: '',
      email: '',
      role: '',
      customRole: '',
      branchId: '',
      enabledModules: DASHBOARD_MODULES.map((m) => m.id),
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newClientData.name.trim()) {
      errors.name = 'Client name is required';
    }
    
    if (!newClientData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddClientSave = async () => {
    if (!agencyId) {
      toast({
        variant: 'destructive',
        title: 'No Agency Selected',
        description: 'Please select an agency before adding a client.',
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingClientId) {
        // Update existing client
        const updated = await updateClient(editingClientId, {
          name: newClientData.name,
          contact_name: newClientData.contactName,
          email: newClientData.email,
          phone: newClientData.phone,
          address: newClientData.address,
          package: newClientData.package,
          franchise_super_user_access: newClientData.franchiseSuperUserAccess,
          franchise_group_id: newClientData.franchiseSuperUserAccess && newClientData.franchiseGroupId && newClientData.franchiseGroupId !== '__new__'
            ? newClientData.franchiseGroupId
            : undefined,
          franchise_group_name: newClientData.franchiseSuperUserAccess
            ? (newClientData.franchiseGroupId === '__new__' || !newClientData.franchiseGroupId
              ? (newClientData.franchiseGroupName.trim() || newClientData.name.trim())
              : undefined)
            : undefined,
          enabled_modules: newClientData.enabledModules,
        });

        if (!updated) {
          toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update client. Please try again.',
          });
          return;
        }

        // Load current structure counts (so the card reflects reality)
        const [existingBranches, existingStaff] = await Promise.all([
          fetchClientBranches(editingClientId),
          fetchClientStaffForClient(editingClientId),
        ]);

        // Enforce branch limit: you can't set a branch count smaller than what already exists.
        const desiredBranchCount = Math.max(
          0,
          Number.parseInt(newClientData.branches || '0', 10) || 0
        );

        if (desiredBranchCount > 0 && desiredBranchCount < existingBranches.length) {
          toast({
            variant: 'destructive',
            title: 'Invalid branch count',
            description: `This client already has ${existingBranches.length} branches. Increase "Number of Branches" to add more.`,
          });
          return;
        }

        // If user increased "Number of Branches" but didn't add enough branch cards,
        // create placeholder branches to match the desired count.

        const branchesToPersist = [...newBranches];
        const totalIfAdded = existingBranches.length + branchesToPersist.length;
        const missingBranches = Math.max(0, desiredBranchCount - totalIfAdded);

        if (missingBranches > 0) {
          for (let i = 0; i < missingBranches; i++) {
            const n = existingBranches.length + branchesToPersist.length + 1;
            branchesToPersist.push({
              id: `auto-branch-${Date.now()}-${i}`,
              name: `${newClientData.name} Branch ${n}`,
              address: '',
              phone: '',
              email: '',
              enabledModules: DASHBOARD_MODULES.map((m) => m.id),
            });
          }
        }

        // Persist any newly added branches from the modal.
        // If there are placeholder branches (branches with minimal/no details), fill them in first.
        // Placeholder detection: branch with auto-generated name pattern or missing details.
        const branchIdMap: Record<string, string> = {};
        let createdBranchCount = 0;
        let filledPlaceholderCount = 0;

        // Identify placeholder branches: those with auto-generated names or empty address/phone/email
        const placeholders = existingBranches.filter(
          (b) =>
            b.name.includes('Branch') &&
            (b.address === null || b.address === '') &&
            (b.phone === null || b.phone === '') &&
            (b.email === null || b.email === '')
        );

        for (const branch of branchesToPersist) {
          // If we have unfilled placeholders, update them instead of creating new ones
          if (filledPlaceholderCount < placeholders.length) {
            const placeholderToFill = placeholders[filledPlaceholderCount];
            const updated = await updateClientBranch(placeholderToFill.id, {
              name: branch.name,
              address: branch.address,
              phone: branch.phone,
              email: branch.email,
              enabled_modules: branch.enabledModules,
            });
            if (updated) {
              filledPlaceholderCount += 1;
              branchIdMap[branch.id] = updated.id;
            }
          } else {
            // Otherwise create a new branch
            const inserted = await createClientBranch(editingClientId, {
              name: branch.name,
              address: branch.address,
              phone: branch.phone,
              email: branch.email,
              enabled_modules: branch.enabledModules,
            });
            if (inserted) {
              createdBranchCount += 1;
              branchIdMap[branch.id] = inserted.id;
            }
          }
        }

        // Persist any newly added staff from the modal
        let createdStaffCount = 0;
        for (const staff of newStaff) {
          const mappedBranchId = staff.branchId
            ? // If this staff member was assigned to a newly created branch, map the temp ID
              // to the real DB ID. Otherwise, assume it already refers to an existing branch.
              branchIdMap[staff.branchId] ?? staff.branchId
            : null;

          const inserted = await createClientStaff(editingClientId, {
            branch_id: mappedBranchId,
            name: staff.name,
            email: staff.email,
            role: staff.role,
            enabled_modules: staff.enabledModules,
          });
          if (inserted) createdStaffCount += 1;
        }

        const nextBranchesCount = existingBranches.length + createdBranchCount;
        const nextStaffCount = existingStaff.length + createdStaffCount;

        setClients((prevClients) =>
          prevClients.map((client) =>
            client.id === editingClientId
              ? mapClientRowToClient(updated, nextBranchesCount, nextStaffCount)
              : client
          )
        );

        // Keep the open profile (if any) in sync
        setClientToView((prev) =>
          prev && prev.id === editingClientId
            ? {
                ...prev,
                name: updated.name,
                contactName: updated.contact_name ?? undefined,
                email: updated.email,
                phone: updated.phone ?? '',
                address: updated.address ?? '',
                package: (updated.package as any) ?? prev.package,
                status: (updated.status as any) ?? prev.status,
                franchiseSuperUserAccess: updated.franchise_super_user_access ?? prev.franchiseSuperUserAccess,
                franchiseGroupId: updated.franchise_group_id ?? prev.franchiseGroupId,
                franchiseGroupName: updated.franchise_group_name ?? prev.franchiseGroupName,
                branches: nextBranchesCount,
                staffCount: nextStaffCount,
                enabledModules: (updated.enabled_modules as string[]) ?? prev.enabledModules,
              }
            : prev
        );

        const refreshedGroups = await fetchFranchiseGroupsForAgency(agencyId);
        setFranchiseGroups(refreshedGroups);

        toast({
          title: 'Client Updated',
          description: `${newClientData.name} has been updated successfully.`,
        });
      } else {
        // Create new client
        const created = await createClientForAgency(agencyId, {
          name: newClientData.name,
          contact_name: newClientData.contactName,
          email: newClientData.email,
          phone: newClientData.phone,
          address: newClientData.address,
          package: newClientData.package,
          status: 'active',
          franchise_super_user_access: newClientData.franchiseSuperUserAccess,
          franchise_group_id: newClientData.franchiseSuperUserAccess && newClientData.franchiseGroupId && newClientData.franchiseGroupId !== '__new__'
            ? newClientData.franchiseGroupId
            : undefined,
          franchise_group_name: newClientData.franchiseSuperUserAccess
            ? (newClientData.franchiseGroupId === '__new__' || !newClientData.franchiseGroupId
              ? (newClientData.franchiseGroupName.trim() || newClientData.name.trim())
              : undefined)
            : undefined,
          enabled_modules: newClientData.enabledModules,
        });
  
        if (!created) {
          toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: 'Could not create client. Please try again.',
          });
          return;
        }

        // Fire OTP invite to client email so they can set a password / log in as soon as possible.
        // This runs in the background and does not block saving branches/staff.
        if (newClientData.email) {
          void inviteUserByEmail(newClientData.email, 'client', agencyId, {
            client_id: created.id,
            agency_id: agencyId,
            invited_via: 'owner_clients',
            franchise_super_user_access: newClientData.franchiseSuperUserAccess,
            franchise_group_id: newClientData.franchiseSuperUserAccess && newClientData.franchiseGroupId && newClientData.franchiseGroupId !== '__new__'
              ? newClientData.franchiseGroupId
              : undefined,
            franchise_group_name: newClientData.franchiseSuperUserAccess
              ? (newClientData.franchiseGroupId === '__new__' || !newClientData.franchiseGroupId
                ? (newClientData.franchiseGroupName.trim() || newClientData.name.trim())
                : undefined)
              : undefined,
          });
        }

      // Determine how many branches to create.
      // If the user filled "Number of Branches" but didn't add branch cards, we create placeholder branches
      // so the UI (and DB) correctly reflect the branch count.
      const desiredBranchCount = Math.max(0, Number.parseInt(newClientData.branches || '0', 10) || 0);

      if (desiredBranchCount > 0 && newBranches.length > desiredBranchCount) {
        toast({
          variant: 'destructive',
          title: 'Too many branches',
          description: `You set Number of Branches to ${desiredBranchCount}, but added ${newBranches.length} branch details. Increase the number to add more.`,
        });
        return;
      }

      const branchesToPersist = [...newBranches];
      const missingBranches = Math.max(0, desiredBranchCount - branchesToPersist.length);
      if (missingBranches > 0) {
        for (let i = 0; i < missingBranches; i++) {
          const n = branchesToPersist.length + 1;
          branchesToPersist.push({
            id: `auto-branch-${Date.now()}-${i}`,
            name: `${newClientData.name} Branch ${n}`,
            address: '',
            phone: '',
            email: '',
            enabledModules: DASHBOARD_MODULES.map((m) => m.id),
          });
        }
      }

      // Persist branches for this client and map temp IDs -> DB IDs
      const branchIdMap: Record<string, string> = {};
      let createdBranchCount = 0;
      for (const branch of branchesToPersist) {
        const inserted = await createClientBranch(created.id, {
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          enabled_modules: branch.enabledModules,
        });
        if (inserted) {
          createdBranchCount += 1;
          branchIdMap[branch.id] = inserted.id;
        }
      }

      // Persist staff members, mapping their branchId to the new DB branch IDs
      let createdStaffCount = 0;
      for (const staff of newStaff) {
        const mappedBranchId = staff.branchId
          ? branchIdMap[staff.branchId] ?? staff.branchId
          : null;
        const inserted = await createClientStaff(created.id, {
          branch_id: mappedBranchId,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          enabled_modules: staff.enabledModules,
        });
        if (inserted) createdStaffCount += 1;
      }
  
        // Set initial branch/staff counts based on what we just saved
        const createdClient = mapClientRowToClient(created, createdBranchCount, createdStaffCount);
        setClients(prevClients => [...prevClients, createdClient]);

        const refreshedGroups = await fetchFranchiseGroupsForAgency(agencyId);
        setFranchiseGroups(refreshedGroups);
  
        toast({
          title: 'Client Created',
          description: `${newClientData.name} has been added successfully.`,
        });
      }

      setAddClientOpen(false);
      resetClientForm();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePackageUpgrade = async (clientId: string) => {
    const updated = await updateClient(clientId, { package: 'Pro' });
    if (!updated) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: 'Could not upgrade client package. Please try again.',
      });
      return;
    }

    setClients(prevClients =>
      prevClients.map(client =>
        client.id === clientId ? mapClientRowToClient(updated, client.branches) : client
      )
    );

    toast({
      title: 'Package Upgraded',
      description: 'Client has been upgraded to Pro package.',
    });
  };

  const handlePackageDowngrade = async (clientId: string) => {
    const updated = await updateClient(clientId, { package: 'Standard' });
    if (!updated) {
      toast({
        variant: 'destructive',
        title: 'Downgrade Failed',
        description: 'Could not downgrade client package. Please try again.',
      });
      return;
    }

    setClients(prevClients =>
      prevClients.map(client =>
        client.id === clientId ? mapClientRowToClient(updated, client.branches) : client
      )
    );

    toast({
      title: 'Package Changed',
      description: 'Client has been changed to Standard package.',
    });
  };

  const handleToggleClientActive = async (clientId: string) => {
    const current = clients.find((c) => c.id === clientId);
    if (!current) return;

    const nextStatus = current.status === 'inactive' ? 'active' : 'inactive';
    if (nextStatus === 'inactive') {
      const ok = await confirmDialog('Deactivate this client? They will be marked inactive but not deleted.', {
        title: 'Deactivate client?',
        confirmText: 'Deactivate',
        variant: 'destructive',
      });
      if (!ok) return;
    }

    const updated = await updateClient(clientId, { status: nextStatus });
    if (!updated) {
      toast({
        variant: 'destructive',
        title: 'Status Update Failed',
        description: 'Could not update client status. Please try again.',
      });
      return;
    }

    setClients(prevClients =>
      prevClients.map(client =>
        client.id === clientId ? mapClientRowToClient(updated, client.branches) : client
      )
    );
  };

  const handleRemoveClient = async (clientId: string) => {
    const confirmDelete = await confirmDialog('Remove this client? This will also delete all their branches and staff. This cannot be undone.', {
      title: 'Remove client?',
      confirmText: 'Remove',
      variant: 'destructive',
    });
    if (!confirmDelete) return;

    const success = await deleteClient(clientId);
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Removal Failed',
        description: 'Could not remove client. Please try again.',
      });
      return;
    }

    setClients(prevClients => prevClients.filter(client => client.id !== clientId));

    if (selectedClient === clientId) {
      setSelectedClient(null);
    }

    toast({
      title: 'Client Removed',
      description: 'The client and all associated data have been removed.',
    });
  };

  const handleEditClient = async (client: Client) => {
    setEditingClientId(client.id);
    setEditingBaseCounts({ branches: client.branches ?? 0, staff: client.staffCount ?? 0 });
    setNewClientData({
      name: client.name,
      contactName: client.contactName ?? '',
      email: client.email,
      phone: client.phone,
      address: client.address,
      branches: String(client.branches ?? ''),
      package: client.package,
      notes: '',
      enabledModules: client.enabledModules ?? DASHBOARD_MODULES.map((m) => m.id),
      franchiseSuperUserAccess: client.franchiseSuperUserAccess ?? false,
      franchiseGroupId: client.franchiseGroupId ?? '',
      franchiseGroupName: client.franchiseGroupName ?? client.name,
    });

    // Load existing branches for this client
    const branches = await fetchClientBranches(client.id);
    setExistingBranches(branches);

    // New branches/staff can be added in this modal (and will be persisted on save).
    setNewBranches([]);
    setNewStaff([]);
    setAddClientOpen(true);
  };

  const handleViewClient = (client: Client) => {
    setClientToView(client);
    setClientDetailOpen(true);
  };

  const handleSendAgreement = (client: Client) => {
    setClientToSendAgreement(client);
    setSendAgreementOpen(true);
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              'gap-2',
              viewMode === 'grid' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <LayoutGridIcon className="h-4 w-4" strokeWidth={1.5} />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn(
              'gap-2',
              viewMode === 'list' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <ListIcon className="h-4 w-4" strokeWidth={1.5} />
            List
          </Button>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap md:w-auto">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="h-9 w-full bg-background text-foreground border-border sm:w-[140px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground">
              <SelectItem value="active">Active Clients</SelectItem>
              <SelectItem value="inactive">Inactive Clients</SelectItem>
              <SelectItem value="all">All Clients</SelectItem>
            </SelectContent>
          </Select>

          {searchOpen ? (
            <div className="relative w-full animate-in fade-in slide-in-from-right-5 duration-200 sm:w-64">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                className="h-9 w-full pl-9 bg-background text-foreground shadow-sm"
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

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            onClick={() => {
              resetClientForm();
              setAddClientOpen(true);
            }}
          >
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Add New Client
          </Button>
        </div>
      </div>

      <div className={cn(
        viewMode === 'grid' 
          ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'flex flex-col gap-4'
      )}>
        {filteredClients.map((client) => viewMode === 'grid' ? (
          <Card
            key={client.id}
            className={cn(
              'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-lg',
              selectedClient === client.id && 'ring-2 ring-primary'
            )}
            onClick={() => handleViewClient(client)}
          >
            <CardHeader className="relative flex flex-row items-start justify-between gap-3 pb-4 pr-3">
              <div className="flex items-start gap-3 flex-1 pr-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-foreground truncate">
                      {client.name}
                    </CardTitle>
                    <span className={cn(
                      'h-2.5 w-2.5 rounded-full shrink-0',
                      statusColors[client.status]
                    )} />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {client.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {client.phone}
                  </p>
                </div>
              </div>

              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                    <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                    >
                      <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Edit Client
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleViewClient(client)}
                    >
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendAgreement(client);
                      }}
                    >
                      <FileTextIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Send Agreement
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleToggleClientActive(client.id)}
                      className={cn(
                        'cursor-pointer',
                        client.status === 'inactive'
                          ? 'text-success hover:bg-success/10 hover:text-success'
                          : 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                      )}
                    >
                      {client.status === 'inactive' ? 'Activate' : 'Deactivate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {client.package === 'Standard' && (
                      <DropdownMenuItem
                        onClick={() => handlePackageUpgrade(client.id)}
                        className="text-success hover:bg-success/10 hover:text-success cursor-pointer"
                      >
                        <ArrowUpCircleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Upgrade to Pro
                      </DropdownMenuItem>
                    )}
                    {client.package === 'Pro' && (
                      <DropdownMenuItem
                        onClick={() => handlePackageDowngrade(client.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground cursor-pointer"
                      >
                        <ArrowDownCircleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Downgrade to Standard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRemoveClient(client.id);
                      }}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <HomeIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-foreground truncate">{client.address}</span>
                </div>
              </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground leading-tight">Branches</p>
                    <p className="text-sm font-semibold text-foreground">{client.branches}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground leading-tight">Staff</p>
                    <p className="text-sm font-semibold text-foreground">{client.staffCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground leading-tight">Package</p>
                    <p className="text-sm font-semibold text-foreground">{client.package}</p>
                  </div>
                </div>
            </CardContent>
          </Card>
        ) : (
          <Card
            key={client.id}
            className={cn(
              'bg-card text-card-foreground cursor-pointer transition-all duration-200 hover:shadow-lg',
              selectedClient === client.id && 'ring-2 ring-primary'
            )}
            onClick={() => handleViewClient(client)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-center gap-3 mb-2">
                      <h3 className="min-w-0 truncate text-xl font-bold text-foreground">
                        {client.name}
                      </h3>
                      <span className={cn(
                        'h-3 w-3 rounded-full shrink-0',
                        statusColors[client.status]
                      )} />
                      <span className="min-w-0 truncate text-sm text-muted-foreground">
                        {client.email}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        <span className="text-foreground">{client.phone}</span>
                      </div>
                      
                      <div className="flex min-w-0 items-center gap-2">
                        <HomeIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        <span className="min-w-0 truncate text-foreground">{client.address}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Branches</p>
                    <p className="text-xl font-semibold text-foreground">{client.branches}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Staff</p>
                    <p className="text-xl font-semibold text-foreground">{client.staffCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Package</p>
                    <p className="text-xl font-semibold text-foreground">{client.package}</p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                      <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className="text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClient(client);
                        }}
                      >
                        <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Edit Client
                      </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleViewClient(client)}
                      >
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendAgreement(client);
                        }}
                      >
                        <FileTextIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Send Agreement
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleClientActive(client.id)}
                        className={cn(
                          'cursor-pointer',
                          client.status === 'inactive'
                            ? 'text-success hover:bg-success/10 hover:text-success'
                            : 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                        )}
                      >
                        {client.status === 'inactive' ? 'Activate' : 'Deactivate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {client.package === 'Standard' && (
                        <DropdownMenuItem 
                          onClick={() => handlePackageUpgrade(client.id)}
                          className="text-success hover:bg-success/10 hover:text-success cursor-pointer"
                        >
                          <ArrowUpCircleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Upgrade to Pro
                        </DropdownMenuItem>
                      )}
                      {client.package === 'Pro' && (
                        <DropdownMenuItem 
                          onClick={() => handlePackageDowngrade(client.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground cursor-pointer"
                        >
                          <ArrowDownCircleIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                          Downgrade to Standard
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemoveClient(client.id);
                        }}
                      >
                        <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoadingClients ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <Loader2Icon className="h-10 w-10 text-muted-foreground mb-4 animate-spin" />
          <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">Loading clients…</h3>
          <p className="text-muted-foreground text-sm">Fetching data from Supabase.</p>
        </div>
      ) : clientsLoadError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">Couldn’t load clients</h3>
          <p className="text-muted-foreground text-sm">{clientsLoadError}</p>
        </div>
      ) : (
        filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
            <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">No clients found</h3>
            <p className="text-muted-foreground">Try adjusting your search query</p>
          </div>
        )
      )}

      {/* Add New Client Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="sm:max-w-[1100px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">
              {editingClientId ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
                <div className="w-full overflow-x-auto pb-2 mb-4">
                  <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
                    <TabsTrigger 
                      value="details"
                      className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                    >
                      Client Details
                    </TabsTrigger>
                    <TabsTrigger 
                      value="branches"
                      className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                    >
                      Branches
                    </TabsTrigger>
                    <TabsTrigger 
                      value="staff"
                      className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                    >
                      Staff
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="details" className="space-y-6 py-4">
                  <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <Checkbox
                      id="franchise-super-user-access"
                      checked={newClientData.franchiseSuperUserAccess}
                      onCheckedChange={(checked) =>
                        setNewClientData((prev) => ({
                          ...prev,
                          franchiseSuperUserAccess: checked === true,
                          franchiseGroupId: checked === true ? (prev.franchiseGroupId || '__new__') : '',
                          franchiseGroupName: checked === true ? prev.franchiseGroupName : '',
                        }))
                      }
                      className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="franchise-super-user-access" className="cursor-pointer text-sm font-semibold text-foreground">
                        Franchise / super user access
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Link this client to an existing franchise group, or create a new one.
                      </p>
                      {newClientData.franchiseSuperUserAccess && (
                        <div className="pt-2 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="franchise-group-id" className="text-xs font-medium text-foreground">
                              Franchise group
                            </Label>
                            <Select
                              value={newClientData.franchiseGroupId || '__new__'}
                              onValueChange={(value) =>
                                setNewClientData((prev) => ({
                                  ...prev,
                                  franchiseGroupId: value,
                                  franchiseGroupName: value === '__new__' ? prev.franchiseGroupName : '',
                                }))
                              }
                            >
                              <SelectTrigger id="franchise-group-id" className="bg-background text-foreground">
                                <SelectValue placeholder="Choose a franchise group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__new__">Create new group</SelectItem>
                                {franchiseGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {(newClientData.franchiseGroupId === '__new__' || !newClientData.franchiseGroupId) && (
                            <div className="space-y-2">
                              <Label htmlFor="franchise-group-name" className="text-xs font-medium text-foreground">
                                New group name
                              </Label>
                              <Input
                                id="franchise-group-name"
                                value={newClientData.franchiseGroupName}
                                onChange={(e) =>
                                  setNewClientData((prev) => ({ ...prev, franchiseGroupName: e.target.value }))
                                }
                                placeholder={newClientData.name || 'e.g. ABC Estate Group'}
                                className="bg-background text-foreground"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-name" className="text-foreground">
                        Client Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="client-name"
                        type="text"
                        placeholder="Estate Agent Name"
                        value={newClientData.name}
                        onChange={(e) => {
                          setNewClientData({ ...newClientData, name: e.target.value });
                          if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                        }}
                        className={cn(
                          "bg-background text-foreground",
                          formErrors.name && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {formErrors.name && (
                        <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-contact-name" className="text-foreground">
                        Main Contact Name
                      </Label>
                      <Input
                        id="client-contact-name"
                        type="text"
                        placeholder="e.g. John Smith"
                        value={newClientData.contactName}
                        onChange={(e) => setNewClientData({ ...newClientData, contactName: e.target.value })}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-email" className="text-foreground">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="client-email"
                        type="email"
                        placeholder="client@example.com"
                        value={newClientData.email}
                        onChange={(e) => {
                          setNewClientData({ ...newClientData, email: e.target.value });
                          if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                        }}
                        className={cn(
                          "bg-background text-foreground",
                          formErrors.email && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {formErrors.email && (
                        <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-phone" className="text-foreground">
                        Phone
                      </Label>
                      <Input
                        id="client-phone"
                        type="tel"
                        placeholder="07700 900123"
                        value={newClientData.phone}
                        onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-branches" className="text-foreground">
                        Number of Branches
                      </Label>
                      <Input
                        id="client-branches"
                        type="number"
                        placeholder="e.g., 1"
                        value={newClientData.branches}
                        onChange={(e) => {
                          const next = e.target.value;
                          setNewClientData({ ...newClientData, branches: next });
                          setBranchesCountMode(next.trim() === '' ? 'auto' : 'manual');
                        }}
                        className="bg-background text-foreground"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client-address" className="text-foreground">
                      Address
                    </Label>
                    <Input
                      id="client-address"
                      type="text"
                      placeholder="123 Main St, City"
                      value={newClientData.address}
                      onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-package" className="text-foreground">
                      Package
                    </Label>
                    <Select
                      value={newClientData.package}
                      onValueChange={(value) => setNewClientData({ ...newClientData, package: value as 'Standard' | 'Pro' })}
                    >
                      <SelectTrigger id="client-package" className="bg-background text-foreground border-border">
                        <SelectValue placeholder="Select package" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client-notes" className="text-foreground">
                      Notes
                    </Label>
                    <Textarea
                      id="client-notes"
                      placeholder="Any additional notes..."
                      value={newClientData.notes}
                      onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
                      className="bg-background text-foreground min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <LayoutDashboardIcon className="h-4 w-4 text-primary" />
                      <Label className="text-foreground font-semibold">Dashboard Configuration</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Select the modules available on the main toolbar for this client.</p>
                    
                    <div className="grid grid-cols-2 gap-3 p-4 border border-border rounded-lg bg-muted/20">
                      {DASHBOARD_MODULES.map((module) => (
                        <div key={module.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`module-${module.id}`} 
                            checked={newClientData.enabledModules.includes(module.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewClientData(prev => ({ ...prev, enabledModules: [...prev.enabledModules, module.id] }));
                              } else {
                                setNewClientData(prev => ({ ...prev, enabledModules: prev.enabledModules.filter(id => id !== module.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`module-${module.id}`} className="text-sm font-normal cursor-pointer">
                            {module.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="branches" className="space-y-6 py-4">
                <div className="space-y-4">
                  {editingClientId && existingBranches.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <Label className="text-sm font-semibold mb-2 block">Existing Branches</Label>
                    <div className="space-y-2">
                      {existingBranches.map((branch, idx) => {
                        const isPlaceholder =
                          branch.name.includes('Branch') &&
                          (branch.address === null || branch.address === '') &&
                          (branch.phone === null || branch.phone === '') &&
                          (branch.email === null || branch.email === '');
                        return (
                          <div
                            key={branch.id}
                            className={cn(
                              'flex items-center justify-between p-3 bg-card border rounded-lg transition-all',
                              isPlaceholder ? 'border-dashed border-yellow-500/50 hover:border-yellow-500 hover:shadow-sm cursor-pointer' : 'border-border'
                            )}
                            onClick={() => {
                              if (isPlaceholder) {
                                // Pre-fill the form with the branch data for editing
                                setTempBranch({
                                  name: branch.name,
                                  address: branch.address || '',
                                  phone: branch.phone || '',
                                  email: branch.email || '',
                                  enabledModules: Array.isArray(branch.enabled_modules) 
                                    ? branch.enabled_modules 
                                    : DASHBOARD_MODULES.map(m => m.id),
                                  editingId: branch.id, // Track which branch we're editing
                                });
                                // Scroll to the form
                                document.querySelector('.branch-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <Building2Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {branch.name}
                                  {isPlaceholder && (
                                    <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-500">
                                      (placeholder - click to edit)
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {branch.address || 'No address'} • {branch.phone || 'No phone'}
                                </p>
                              </div>
                            </div>
                            {isPlaceholder && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTempBranch({
                                    name: branch.name,
                                    address: branch.address || '',
                                    phone: branch.phone || '',
                                    email: branch.email || '',
                                    enabledModules: Array.isArray(branch.enabled_modules) 
                                      ? branch.enabled_modules 
                                      : DASHBOARD_MODULES.map(m => m.id),
                                    editingId: branch.id,
                                  });
                                }}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="branch-form-section grid grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input 
                      placeholder="e.g. Central London" 
                      value={tempBranch.name}
                      onChange={(e) => setTempBranch({...tempBranch, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input 
                      placeholder="123 High St" 
                      value={tempBranch.address}
                      onChange={(e) => setTempBranch({...tempBranch, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      placeholder="020 7123 4567" 
                      value={tempBranch.phone}
                      onChange={(e) => setTempBranch({...tempBranch, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      placeholder="branch@example.com" 
                      value={tempBranch.email}
                      onChange={(e) => setTempBranch({...tempBranch, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Branch Toolbar Configuration</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {DASHBOARD_MODULES.map((module) => (

                        <div key={`branch-mod-${module.id}`} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`branch-mod-${module.id}`} 
                            checked={tempBranch.enabledModules.includes(module.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setTempBranch(prev => ({ ...prev, enabledModules: [...prev.enabledModules, module.id] }));
                              } else {
                                setTempBranch(prev => ({ ...prev, enabledModules: prev.enabledModules.filter(id => id !== module.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`branch-mod-${module.id}`} className="text-xs cursor-pointer">
                            {module.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-between">
                    {Number.isFinite(effectiveBranchLimit) && effectiveBranchLimit !== Number.POSITIVE_INFINITY && (
                      <p className="text-xs text-muted-foreground">
                        {plannedBranchesCount}/{effectiveBranchLimit} branches
                        {!canAddMoreBranches && ' (increase Number of Branches to add more)'}
                      </p>
                    )}
                    <Button
                      onClick={handleAddBranch}
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      disabled={!canAddTempBranch || (!canAddMoreBranches && !tempBranch.editingId)}
                    >
                      {tempBranch.editingId ? (
                        <>
                          <CheckIcon className="h-4 w-4 mr-2" /> Update Branch
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4 mr-2" /> Add Branch
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Added Branches ({newBranches.length})</Label>
                  <ScrollArea className="h-[200px] border border-border rounded-md p-2">
                    {newBranches.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                        <Building2Icon className="h-8 w-8 mb-2 opacity-20" />
                        No branches added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newBranches.map((branch, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <Building2Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{branch.name}</p>
                                <p className="text-xs text-muted-foreground">{branch.address}</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setNewBranches(newBranches.filter((_, i) => i !== idx))}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
                </TabsContent>

                <TabsContent value="staff" className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/10">
                    <div className="space-y-2">
                    <Label>Staff Name</Label>
                    <Input 
                      placeholder="e.g. John Doe" 
                      value={tempStaff.name}
                      onChange={(e) => setTempStaff({...tempStaff, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      placeholder="john@example.com" 
                      value={tempStaff.email}
                      onChange={(e) => setTempStaff({...tempStaff, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={tempStaff.role} 
                      onValueChange={(value) => setTempStaff({...tempStaff, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign to Branch</Label>
                    <Select 
                      value={tempStaff.branchId} 
                      onValueChange={(value) => setTempStaff({...tempStaff, branchId: value})}
                      disabled={staffAssignableBranches.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={staffAssignableBranches.length === 0 ? "Add branches first" : "Select branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {staffAssignableBranches.map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Staff Toolbar Configuration</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {DASHBOARD_MODULES.map((module) => (
                        <div key={`staff-mod-${module.id}`} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`staff-mod-${module.id}`} 
                            checked={tempStaff.enabledModules.includes(module.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setTempStaff(prev => ({ ...prev, enabledModules: [...prev.enabledModules, module.id] }));
                              } else {
                                setTempStaff(prev => ({ ...prev, enabledModules: prev.enabledModules.filter(id => id !== module.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`staff-mod-${module.id}`} className="text-xs cursor-pointer">
                            {module.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button
                      onClick={handleAddStaff}
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      disabled={!canAddTempStaff}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" /> Add Staff Member
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Added Staff ({newStaff.length})</Label>
                  <ScrollArea className="h-[200px] border border-border rounded-md p-2">
                    {newStaff.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                        <UsersIcon className="h-8 w-8 mb-2 opacity-20" />
                        No staff added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newStaff.map((staffMember, idx) => {
                          const branchName =
                            staffAssignableBranches.find(b => b.id === staffMember.branchId)?.name ||
                            'Unknown Branch';
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                  <UserIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{staffMember.name} <span className="text-xs text-muted-foreground">({staffMember.role})</span></p>
                                  <p className="text-xs text-muted-foreground">{branchName}</p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => setNewStaff(newStaff.filter((_, i) => i !== idx))}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
                </TabsContent>
              </Tabs>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setAddClientOpen(false);
                resetClientForm();
              }}
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddClientSave}
              disabled={!isFormValid || isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientDetailDialog 
        open={clientDetailOpen} 
        onOpenChange={setClientDetailOpen} 
        client={clientToView} 
        onCountsChange={(clientId, counts) => {
          setClients((prev) =>
            prev.map((c) =>
              c.id === clientId
                ? {
                    ...c,
                    branches: counts.branches ?? c.branches,
                    staffCount: counts.staff ?? c.staffCount,
                  }
                : c
            )
          );

          setClientToView((prev) =>
            prev && prev.id === clientId
              ? {
                  ...prev,
                  branches: counts.branches ?? prev.branches,
                  staffCount: counts.staff ?? prev.staffCount,
                }
              : prev
          );
        }}
      />

      <SendAgreementDialog
        open={sendAgreementOpen}
        onOpenChange={setSendAgreementOpen}
        client={clientToSendAgreement}
      />
    </div>
  );
}
