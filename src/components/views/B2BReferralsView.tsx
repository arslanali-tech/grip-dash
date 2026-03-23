import { useEffect, useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UkAddressAutocompleteInput } from '@/components/UkAddressAutocompleteInput';
import {
  B2BCompanyRow,
  B2BReferralRow,
  createB2BCompany,
  createB2BReferral,
  deleteB2BCompany,
  deleteB2BReferral,
  fetchB2BCompanies,
  fetchB2BReferrals,
  updateB2BCompany,
  updateB2BReferral,
} from '@/lib/ownerApi';
import { 
  PlusIcon, 
  SearchIcon, 
  SettingsIcon,
  Building2Icon,
  ScaleIcon,
  HomeIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  XIcon,
  EyeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/hooks/use-confirm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { notifyError } from '@/lib/notify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddB2BCompanyDialog } from '../AddB2BCompanyDialog';
import { EditB2BCompanyDialog } from '../EditB2BCompanyDialog';
import { B2BReferralsSummaryCards } from '../B2BReferralsSummaryCards';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboardStore } from '@/stores/dashboardStore';

export type B2BReferralType = 'mortgage' | 'aml' | 'legal' | 'conveyancing' | (string & {});

export interface B2BCompany {
  id: string;
  name: string;
  type: B2BReferralType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  commissionType: 'fixed' | 'percentage';
  commissionValue: number;
  notes?: string;
  totalReferrals: number;
  totalCommission: number;
  status: 'active' | 'inactive';
  branchId?: string | null;
}

export interface B2BReferral {
  id: string;
  companyId: string;
  propertyAddress: string;
  clientName: string;
  transactionType: string | null;
  referralDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  commissionAmount: number | null;
  notes: string | null;
  link: string | null;
  branchId?: string | null;
}

const referralTypeConfig = {
  mortgage: { label: 'Mortgage Referrals', icon: HomeIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
  aml: { label: 'AML Referrals', icon: ShieldCheckIcon, color: 'text-purple-600', bg: 'bg-purple-100' },
  legal: { label: 'Legal Referrals', icon: ScaleIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
  conveyancing: { label: 'Conveyancing', icon: Building2Icon, color: 'text-green-600', bg: 'bg-green-100' },
};

const formatReferralTypeLabel = (type: string): string => {
  if (!type) return 'Other Referrals';
  return type
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getReferralTypeConfig = (type: string) => {
  const known = referralTypeConfig[type as keyof typeof referralTypeConfig];
  if (known) return known;
  return {
    label: formatReferralTypeLabel(type),
    icon: Building2Icon,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  };
};

interface B2BReferralsViewProps {
  agencyId?: string;
  branchId?: string;
}

export function B2BReferralsView({ agencyId, branchId }: B2BReferralsViewProps) {
  const isMobile = useIsMobile();
  const { clientId } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | B2BReferralType>('all');
  const [companies, setCompanies] = useState<B2BCompany[]>([]);
  const [referrals, setReferrals] = useState<B2BReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<B2BCompany | null>(null);
  const [addReferralOpen, setAddReferralOpen] = useState(false);
  const [selectedCompanyForReferral, setSelectedCompanyForReferral] = useState<B2BCompany | null>(null);
  const [viewReferralsOpen, setViewReferralsOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<B2BCompany | null>(null);

  // New referral form state
  const [newReferralPropertyAddress, setNewReferralPropertyAddress] = useState('');
  const [newReferralClientName, setNewReferralClientName] = useState('');
  const [newReferralTransactionType, setNewReferralTransactionType] = useState('');
  const [newReferralDate, setNewReferralDate] = useState('');
  const [newReferralNotes, setNewReferralNotes] = useState('');
  const [newReferralLink, setNewReferralLink] = useState('');

  const mapRowToCompany = (row: B2BCompanyRow): B2BCompany => ({
    id: row.id,
    name: row.name,
    type: row.type as B2BReferralType,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone ?? '',
    commissionType: row.commission_type as 'fixed' | 'percentage',
    commissionValue: Number(row.commission_value ?? 0),
    notes: row.notes ?? undefined,
    totalReferrals: row.total_referrals ?? 0,
    totalCommission: Number(row.total_commission ?? 0),
    status: (row.status as 'active' | 'inactive') ?? 'active',
    branchId: (row as any).branch_id ?? null,
  });

  const mapRowToReferral = (row: B2BReferralRow): B2BReferral => ({
    id: row.id,
    companyId: row.company_id,
    propertyAddress: row.property_address,
    clientName: row.client_name,
    transactionType: row.transaction_type,
    referralDate: row.referral_date,
    status: (row.status as 'pending' | 'completed' | 'cancelled') ?? 'pending',
    commissionAmount: row.commission_amount,
    notes: row.notes,
    link: row.link,
    branchId: (row as any).branch_id ?? null,
  });

  useEffect(() => {
    console.log('[B2BReferralsView] agencyId:', agencyId, 'branchId:', branchId);
    const load = async () => {
      if (!agencyId) {
        setCompanies([]);
        setReferrals([]);
        return;
      }

      console.log('[B2BReferralsView] Loading companies and referrals from DB...');
      setLoading(true);
      const [companyRows, referralRows] = await Promise.all([
        fetchB2BCompanies(agencyId, clientId ?? undefined),
        fetchB2BReferrals(agencyId, clientId ?? undefined),
      ]);

      const mappedCompanies = companyRows.map(mapRowToCompany);
      const mappedReferrals = referralRows.map(mapRowToReferral);

      // Branch-scoping for branch managers
      const scopedCompanies = branchId
        ? mappedCompanies.filter((c) => (c.branchId ?? null) === branchId)
        : mappedCompanies;
      const scopedReferrals = branchId
        ? mappedReferrals.filter((r) => (r.branchId ?? null) === branchId)
        : mappedReferrals;

      console.log('[B2BReferralsView] Loaded:', { companies: scopedCompanies.length, referrals: scopedReferrals.length });
      setCompanies(scopedCompanies);
      setReferrals(scopedReferrals);
      setLoading(false);
    };

    void load();
  }, [agencyId, branchId, clientId]);

  // Compute dynamic totals from referrals
  const companiesWithDynamicTotals = useMemo(() => {
    return companies.map(company => {
      const companyReferrals = referrals.filter(r => r.companyId === company.id);
      const completedReferrals = companyReferrals.filter(r => r.status === 'completed');
      const totalReferrals = companyReferrals.length;
      const totalCommission = completedReferrals.reduce((sum, r) => {
        if (r.commissionAmount) return sum + r.commissionAmount;
        // Calculate from company commission rate if not specified
        return sum + (company.commissionType === 'fixed' ? company.commissionValue : 0);
      }, 0);
      
      return {
        ...company,
        totalReferrals,
        totalCommission,
      };
    });
  }, [companies, referrals]);

  const filteredCompanies = companiesWithDynamicTotals.filter(company => {
    const matchesSearch = 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.contactName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || company.type === activeTab;

    return matchesSearch && matchesTab;
  });

  // Get referrals for the viewing company
  const companyReferrals = useMemo(() => {
    if (!viewingCompany) return [];
    return referrals.filter(r => r.companyId === viewingCompany.id);
  }, [referrals, viewingCompany]);

  const handleAddCompany = async (data: Omit<B2BCompany, 'id' | 'totalReferrals' | 'totalCommission'>) => {
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const created = await createB2BCompany(agencyId, {
      name: data.name,
      type: data.type,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      commission_type: data.commissionType,
      commission_value: data.commissionValue,
      notes: data.notes,
      status: data.status,
      // Branch-scoped for branch managers
      ...(branchId ? ({ branch_id: branchId } as any) : {}),
    }, clientId ?? undefined);

    if (!created) {
      alert('Failed to add company.');
      return;
    }

    setCompanies((prev) => [mapRowToCompany(created), ...prev]);
  };

  const handleEditCompany = (company: B2BCompany) => {
    setSelectedCompany(company);
    setEditCompanyOpen(true);
  };

  const handleSaveEdit = async (updatedCompany: B2BCompany) => {
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const saved = await updateB2BCompany(updatedCompany.id, {
      name: updatedCompany.name,
      type: updatedCompany.type,
      contact_name: updatedCompany.contactName,
      contact_email: updatedCompany.contactEmail,
      contact_phone: updatedCompany.contactPhone,
      commission_type: updatedCompany.commissionType,
      commission_value: updatedCompany.commissionValue,
      notes: updatedCompany.notes,
      total_referrals: updatedCompany.totalReferrals,
      total_commission: updatedCompany.totalCommission,
      status: updatedCompany.status,
      ...(branchId ? ({ branch_id: branchId } as any) : {}),
    });

    if (!saved) {
      alert('Failed to save changes.');
      return;
    }

    const mapped = mapRowToCompany(saved);
    setCompanies((prev) => prev.map((c) => (c.id === mapped.id ? mapped : c)));
  };

  const handleDeleteCompany = async (id: string) => {
    const ok = await confirmDialog('Are you sure you want to delete this company?', {
      title: 'Delete company?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    await deleteB2BCompany(id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleStatus = async (id: string) => {
    const current = companies.find((c) => c.id === id);
    if (!current) return;

    const nextStatus = current.status === 'active' ? 'inactive' : 'active';

    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const saved = await updateB2BCompany(id, { status: nextStatus });
    if (!saved) {
      alert('Could not update status.');
      return;
    }

    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));
  };

  // Referral handlers
  const handleOpenAddReferral = (company: B2BCompany) => {
    setSelectedCompanyForReferral(company);
    setNewReferralPropertyAddress('');
    setNewReferralClientName('');
    setNewReferralTransactionType('');
    setNewReferralDate(new Date().toISOString().split('T')[0]);
    setNewReferralNotes('');
    setNewReferralLink('');
    setAddReferralOpen(true);
  };

  const handleAddReferral = async () => {
    if (!selectedCompanyForReferral || !newReferralPropertyAddress || !newReferralClientName || !newReferralDate) {
      notifyError('Please fill in required fields: Property Address, Client Name, and Date');
      return;
    }

    if (!agencyId) {
      notifyError('No agency context available.');
      return;
    }

    const created = await createB2BReferral(agencyId, {
      company_id: selectedCompanyForReferral.id,
      property_address: newReferralPropertyAddress,
      client_name: newReferralClientName,
      transaction_type: newReferralTransactionType || undefined,
      referral_date: newReferralDate,
      notes: newReferralNotes || undefined,
      link: newReferralLink || undefined,
      ...(branchId ? ({ branch_id: branchId } as any) : {}),
    }, clientId ?? undefined);

    if (!created) {
      notifyError('Failed to add referral.');
      return;
    }

    setReferrals((prev) => [mapRowToReferral(created), ...prev]);
    setAddReferralOpen(false);
  };

  const handleViewReferrals = (company: B2BCompany) => {
    setViewingCompany(company);
    setViewReferralsOpen(true);
  };

  const handleUpdateReferralStatus = async (referralId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    const referral = referrals.find(r => r.id === referralId);
    if (!referral) return;

    const company = companies.find(c => c.id === referral.companyId);
    const commissionAmount = newStatus === 'completed' && company
      ? (company.commissionType === 'fixed' ? company.commissionValue : null)
      : null;

    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    const saved = await updateB2BReferral(referralId, { 
      status: newStatus,
      commission_amount: commissionAmount ?? undefined,
    });
    if (!saved) {
      alert('Could not update referral status.');
      return;
    }

    setReferrals((prev) => prev.map((r) => 
      r.id === referralId 
        ? { ...r, status: newStatus, commissionAmount: commissionAmount } 
        : r
    ));
  };

  const handleDeleteReferral = async (referralId: string) => {
    if (!confirm('Are you sure you want to delete this referral?')) return;

    if (!agencyId) {
      alert('No agency context available.');
      return;
    }

    await deleteB2BReferral(referralId);
    setReferrals((prev) => prev.filter((r) => r.id !== referralId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  return (
    <div className={cn("space-y-4", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Summary Cards */}
      <B2BReferralsSummaryCards companies={companiesWithDynamicTotals} />

      {agencyId && loading && (
        <p className="text-sm text-muted-foreground">Loading companies…</p>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search companies..."
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

          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setAddCompanyOpen(true)}
            disabled={!agencyId}
          >
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Add Company
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <div className="w-full overflow-x-auto pb-2 mb-6">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            <TabsTrigger 
              value="all" 
              className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
            >
              All Companies
            </TabsTrigger>
            {Object.entries(referralTypeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger 
                  key={key}
                  value={key} 
                  className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                >
                  <Icon className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => {
              const typeConfig = getReferralTypeConfig(company.type);
              const TypeIcon = typeConfig.icon;

              return (
                <Card
                  key={company.id}
                  className={cn(
                    "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4",
                    company.status === 'active' ? 'border-l-green-500' : 'border-l-gray-400'
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                          <TypeIcon className={cn("h-5 w-5", typeConfig.color)} strokeWidth={1.5} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">
                            {company.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            <MoreVerticalIcon className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                          <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={() => handleOpenAddReferral(company)}
                          >
                            <PlusIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            Add Referral
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={() => handleViewReferrals(company)}
                          >
                            <EyeIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            View Referrals
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={() => handleEditCompany(company)}
                          >
                            <EditIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={() => handleToggleStatus(company.id)}
                          >
                            <SettingsIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            {company.status === 'active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            onClick={() => handleDeleteCompany(company.id)}
                          >
                            <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      company.status === 'active' 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                    )}>
                      {company.status === 'active' ? 'Active' : 'Inactive'}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contact:</span>
                        <span className="font-medium text-foreground">{company.contactName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-foreground text-xs">{company.contactEmail}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="text-foreground">{company.contactPhone}</span>
                      </div>
                    </div>

                    {/* Commission Details */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Commission Rate</span>
                        <span className="text-lg font-bold text-primary">
                          {company.commissionType === 'fixed' 
                            ? `£${company.commissionValue}` 
                            : `${company.commissionValue}%`}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {company.commissionType === 'fixed' ? 'Fixed per referral' : 'Percentage of deal value'}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Referrals</p>
                        <p className="text-xl font-bold text-foreground">{company.totalReferrals}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Commission</p>
                        <p className="text-xl font-bold text-success">
                          £{company.totalCommission.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {company.notes && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm text-foreground line-clamp-2">{company.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
              <Building2Icon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
              <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
                No companies found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or add a new B2B partner
              </p>
              <Button onClick={() => setAddCompanyOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Add Company
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddB2BCompanyDialog 
        open={addCompanyOpen} 
        onOpenChange={setAddCompanyOpen}
        onSave={handleAddCompany}
      />

      <EditB2BCompanyDialog
        open={editCompanyOpen}
        onOpenChange={setEditCompanyOpen}
        company={selectedCompany}
        onSave={handleSaveEdit}
      />

      {/* Add Referral Dialog */}
      <Dialog open={addReferralOpen} onOpenChange={setAddReferralOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Referral</DialogTitle>
            <DialogDescription>
              {selectedCompanyForReferral && `Add a referral to ${selectedCompanyForReferral.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="property-address">Property Address <span className="text-destructive">*</span></Label>
              <UkAddressAutocompleteInput
                id="property-address"
                value={newReferralPropertyAddress}
                onValueChange={setNewReferralPropertyAddress}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name <span className="text-destructive">*</span></Label>
              <Input
                id="client-name"
                placeholder="John Smith"
                value={newReferralClientName}
                onChange={(e) => setNewReferralClientName(e.target.value)}
              />
            </div>
            {(selectedCompanyForReferral?.type === 'legal' || selectedCompanyForReferral?.type === 'conveyancing') && (
              <div className="space-y-2">
                <Label htmlFor="transaction-type">Transaction Type</Label>
                <Select value={newReferralTransactionType} onValueChange={setNewReferralTransactionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="remortgage">Remortgage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="referral-date">Referral Date <span className="text-destructive">*</span></Label>
              <Input
                id="referral-date"
                type="date"
                value={newReferralDate}
                onChange={(e) => setNewReferralDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral-link">Link (optional)</Label>
              <Input
                id="referral-link"
                type="url"
                placeholder="https://..."
                value={newReferralLink}
                onChange={(e) => setNewReferralLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral-notes">Notes (optional)</Label>
              <Textarea
                id="referral-notes"
                placeholder="Any additional information..."
                value={newReferralNotes}
                onChange={(e) => setNewReferralNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddReferralOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReferral}>
              Add Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Referrals Dialog */}
      <Dialog open={viewReferralsOpen} onOpenChange={setViewReferralsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Referrals - {viewingCompany?.name}</DialogTitle>
            <DialogDescription>
              {companyReferrals.length} referral{companyReferrals.length !== 1 ? 's' : ''} total
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {companyReferrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2Icon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No referrals yet</p>
                <Button 
                  className="mt-4" 
                  onClick={() => {
                    setViewReferralsOpen(false);
                    if (viewingCompany) handleOpenAddReferral(viewingCompany);
                  }}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add First Referral
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate" title={referral.propertyAddress}>
                          {referral.propertyAddress}
                        </div>
                      </TableCell>
                      <TableCell>{referral.clientName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                          {new Date(referral.referralDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          getStatusBadgeClass(referral.status)
                        )}>
                          {getStatusIcon(referral.status)}
                          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {referral.commissionAmount 
                          ? `£${referral.commissionAmount.toLocaleString()}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleUpdateReferralStatus(referral.id, 'pending')}
                              disabled={referral.status === 'pending'}
                            >
                              <ClockIcon className="mr-2 h-4 w-4 text-yellow-600" />
                              Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateReferralStatus(referral.id, 'completed')}
                              disabled={referral.status === 'completed'}
                            >
                              <CheckCircleIcon className="mr-2 h-4 w-4 text-green-600" />
                              Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateReferralStatus(referral.id, 'cancelled')}
                              disabled={referral.status === 'cancelled'}
                            >
                              <XCircleIcon className="mr-2 h-4 w-4 text-red-600" />
                              Cancelled
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteReferral(referral.id)}
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setViewReferralsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setViewReferralsOpen(false);
              if (viewingCompany) handleOpenAddReferral(viewingCompany);
            }}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
