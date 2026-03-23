import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  UserCheckIcon, 
  SearchIcon, 
  PlusIcon, 
  SendIcon, 
  InboxIcon, 
  Building2Icon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  PoundSterlingIcon,
  FilterIcon,
  LayoutGridIcon,
  ListIcon,
  XIcon,
  Loader2Icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SendReferralDialog } from '../SendReferralDialog';
import { ReferralsSummaryCards } from '../ReferralsSummaryCards';
import { createPropertyReferral, fetchPropertyReferrals, PropertyReferralRow, updatePropertyReferral, FetchReferralsResult } from '@/lib/referralsApi';
import { useAuthStore } from '@/stores/authStore';
import { inviteUserByEmail } from '@/lib/ownerApi';
import { useDashboardStore } from '@/stores/dashboardStore';

interface Referral {
  id: string;
  branchId?: string;
  propertyAddress: string;
  propertyType: string;
  estimatedValue: number;
  referralType: 'internal' | 'external';
  direction: 'sent' | 'received';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  fromBranch?: string;
  toBranch?: string;
  fromAgent?: string;
  toAgent?: string;
  externalCompany?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  date: string;
  commission?: number;
}


type ViewMode = 'list' | 'grid';

interface ReferralPropertyViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function ReferralPropertyView({ agencyId, branchId, branchName }: ReferralPropertyViewProps = {}) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { clientId } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [sendReferralOpen, setSendReferralOpen] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tableConfigured, setTableConfigured] = useState(true);
  const mapRowToReferral = (row: PropertyReferralRow): Referral => ({
    id: row.id,
    branchId: row.branch_id ?? undefined,
    propertyAddress: row.property_address,
    propertyType: row.property_type ?? '',
    estimatedValue: Number(row.estimated_value ?? 0),
    referralType: row.referral_type as 'internal' | 'external',
    direction: row.direction as 'sent' | 'received',
    status: row.status as 'pending' | 'accepted' | 'rejected' | 'completed',
    fromBranch: row.from_branch ?? undefined,
    toBranch: row.to_branch ?? undefined,
    fromAgent: row.from_agent ?? undefined,
    toAgent: row.to_agent ?? undefined,
    externalCompany: row.external_company ?? undefined,
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    date: row.referral_date,
    commission: row.commission ?? undefined,
  });

  useEffect(() => {
    const load = async () => {
      if (!agencyId) {
        setReferrals([]);
        return;
      }
      setLoading(true);
      const result = await fetchPropertyReferrals(agencyId, clientId ?? undefined);
      setTableConfigured(result.tableExists);
      let scopedRows = result.data;
      if (branchId) {
        // Show referrals where this branch is either sender or receiver
        scopedRows = result.data.filter(r => (r.from_branch === branchName || r.to_branch === branchName));
      }
      // Set direction based on current branch's role in the referral
      const mapped = scopedRows.map(row => {
        let direction: 'sent' | 'received' = 'sent';
        if (branchName && row.to_branch === branchName) direction = 'received';
        if (branchName && row.from_branch === branchName) direction = 'sent';
        return {
          ...mapRowToReferral(row),
          direction,
        };
      });
      setReferrals(mapped);
      setLoading(false);
    };

    void load();
  }, [agencyId, branchId, branchName, clientId]);

  const handleSendReferral = async (data: any) => {
    if (!agencyId) {
      alert('No agency context available.');
      return;
    }
    const targetBranchName = data.targetBranchName || data.targetBranch || '';

    let created;
    try {
      created = await createPropertyReferral(agencyId, {
        branch_id: branchId,
        property_address: data.propertyAddress,
        property_type: data.propertyType,
        estimated_value: parseFloat(data.estimatedValue.replace(/[^0-9.]/g, '')) || undefined,
        referral_type: data.referralType,
        direction: 'sent',
        status: 'pending',
        from_branch: branchName,
        from_agent: (user?.user_metadata as any)?.name ?? user?.email ?? 'Current User',
        to_branch: targetBranchName || null,
        to_agent: data.targetAgent,
        external_company: data.externalCompany,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        notes: data.notes,
        referral_date: data.date || new Date().toISOString(),
        commission: data.commission ? parseFloat(data.commission.replace(/[^0-9.]/g, '')) : undefined,
      }, clientId ?? undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to send referral.');
      return;
    }

    if (!created) {
      alert('Failed to send referral.');
      return;
    }

    setReferrals((prev) => [mapRowToReferral(created), ...prev]);

    // Send an email invite to external contacts (best-effort)
    if (data.referralType === 'external' && data.contactEmail) {
      try {
        await inviteUserByEmail(
          data.contactEmail,
          'external_referral',
          agencyId,
          {
            invited_via: 'property_referral',
            referral_id: created.id,
            property_address: data.propertyAddress,
            external_company: data.externalCompany ?? '',
          }
        );
      } catch (e) {
        console.warn('Failed to send external referral email', e);
      }
    }
  };

  const handleUpdateStatus = async (referralId: string, status: Referral['status']) => {
    const updated = await updatePropertyReferral(referralId, { status });
    if (!updated) return;
    setReferrals((prev) => prev.map(r => r.id === referralId ? { ...r, status } : r));
  };

  const filteredReferrals = useMemo(() => {
    return referrals.filter(ref => {
      const matchesSearch = 
        ref.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.fromBranch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.toBranch?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab = 
        activeTab === 'all' ||
        (activeTab === 'received' && ref.direction === 'received') ||
        (activeTab === 'sent' && ref.direction === 'sent') ||
        (activeTab === 'internal' && ref.referralType === 'internal') ||
        (activeTab === 'external' && ref.referralType === 'external');

      return matchesSearch && matchesTab;
    });
  }, [referrals, searchQuery, activeTab]);

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { icon: ClockIcon, color: 'bg-yellow-500 text-white', label: 'Pending' },
      accepted: { icon: CheckCircle2Icon, color: 'bg-green-500 text-white', label: 'Accepted' },
      rejected: { icon: XCircleIcon, color: 'bg-red-500 text-white', label: 'Rejected' },
      completed: { icon: CheckCircle2Icon, color: 'bg-blue-500 text-white', label: 'Completed' }
    };
    const { icon: Icon, color, label } = config[status as keyof typeof config];
    
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs shadow-sm", color)}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Summary Cards */}
      <ReferralsSummaryCards referrals={referrals} />

      {agencyId && loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          Loading referrals...
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <TabsTrigger value="all" className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="received" className="text-xs px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <InboxIcon className="h-3 w-3" />
              Received
            </TabsTrigger>
            <TabsTrigger value="sent" className="text-xs px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <SendIcon className="h-3 w-3" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="internal" className="text-xs px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Building2Icon className="h-3 w-3" />
              Internal
            </TabsTrigger>
            <TabsTrigger value="external" className="text-xs px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <UserCheckIcon className="h-3 w-3" />
              External
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-8 px-2',
                viewMode === 'grid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <LayoutGridIcon className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                'h-8 px-2',
                viewMode === 'list' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <ListIcon className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>

          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search referrals..."
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            onClick={() => setSendReferralOpen(true)}
          >
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Send Referral
          </Button>
        </div>
      </div>

      {/* Referrals List/Grid */}
      <div className={cn(
        viewMode === 'grid' 
          ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' 
          : 'space-y-3 max-w-3xl mx-auto'
      )}>
        {filteredReferrals.map((referral) => (
          <Card
            key={referral.id}
            className="bg-card text-card-foreground hover:shadow-md transition-all duration-200 overflow-hidden group"
          >
            <CardContent className="p-5">
              {/* Compact Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-1 truncate">
                    {referral.propertyAddress}
                  </h3>
                  <p className="text-xs text-muted-foreground">{referral.propertyType}</p>
                </div>

                <div className="text-right ml-4 shrink-0">
                  <p className="text-xl font-bold text-foreground">
                    £{(referral.estimatedValue / 1000).toFixed(0)}k
                  </p>
                  {referral.commission && (
                    <p className="text-xs text-success font-medium">
                      +£{(referral.commission / 1000).toFixed(1)}k
                    </p>
                  )}
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                  referral.direction === 'received' 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {referral.direction === 'received' ? <InboxIcon className="h-3 w-3" /> : <SendIcon className="h-3 w-3" />}
                  {referral.direction === 'received' ? 'Received' : 'Sent'}
                </span>

                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                  referral.referralType === 'internal' 
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" 
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                )}>
                  {referral.referralType === 'internal' ? 'Internal' : 'External'}
                </span>

                {getStatusBadge(referral.status)}
              </div>

              {/* From/To Compact */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs w-12">From:</span>
                  <span className="font-medium text-foreground">{referral.fromBranch}</span>
                  <span className="text-muted-foreground text-xs">•</span>
                  <span className="text-muted-foreground text-xs">{referral.fromAgent}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs w-12">To:</span>
                  {referral.referralType === 'internal' ? (
                    <>
                      <span className="font-medium text-foreground">{referral.toBranch}</span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-muted-foreground text-xs">{referral.toAgent}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">{referral.externalCompany}</span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-muted-foreground text-xs">{referral.contactName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {new Date(referral.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>

                {/* Action Buttons */}
                {referral.direction === 'received' && referral.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
                      onClick={() => handleUpdateStatus(referral.id, 'accepted')}
                    >
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-3 text-xs"
                      onClick={() => handleUpdateStatus(referral.id, 'rejected')}
                    >
                      Decline
                    </Button>
                  </div>
                )}

                {referral.status === 'accepted' && referral.direction === 'received' && (
                  <Button 
                    size="sm" 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-3 text-xs"
                    onClick={() => handleUpdateStatus(referral.id, 'completed')}
                  >
                    Add to Movements
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup Required Message */}
      {!tableConfigured && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
            <Building2Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
          </div>
          <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
            Referrals Setup Required
          </h3>
          <p className="text-muted-foreground max-w-md mb-4">
            The referrals feature needs to be configured for your account. Please contact your administrator to run the database migration.
          </p>
          <div className="bg-card border border-border rounded-lg p-4 text-left max-w-lg">
            <p className="text-xs font-mono text-muted-foreground">
              Migration file: <span className="text-foreground">add_chat_attachments_and_fix_referrals.sql</span>
            </p>
          </div>
        </div>
      )}

      {filteredReferrals.length === 0 && tableConfigured && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <UserCheckIcon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
            No referrals found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      <SendReferralDialog 
        open={sendReferralOpen} 
        onOpenChange={setSendReferralOpen}
        onSend={handleSendReferral}
        agencyId={agencyId}
      />
    </div>
  );
}
