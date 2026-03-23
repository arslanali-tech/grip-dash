import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  Building2Icon,
  DollarSignIcon,
  PercentIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknoteIcon,
  Loader2Icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/hooks/use-confirm';
import {
  CommissionRule,
  CommissionRuleInput,
  StaffCommissionTotal,
  BranchCommissionTotal,
  AgencyCommissionTotal,
  StaffCommissionAssignment,
  fetchCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  fetchStaffCommissionTotals,
  fetchBranchCommissionTotals,
  fetchAgencyCommissionTotal,
  assignCommissionRuleToStaff,
  fetchStaffCommissionAssignments,
  removeCommissionAssignment
} from '@/lib/commissionApi';
import { fetchStaffMembers, StaffMemberRow } from '@/lib/ownerApi';

interface CommissionsViewProps {
  agencyId?: string;
}

export function CommissionsView({ agencyId }: CommissionsViewProps) {
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [staffTotals, setStaffTotals] = useState<StaffCommissionTotal[]>([]);
  const [branchTotals, setBranchTotals] = useState<BranchCommissionTotal[]>([]);
  const [agencyTotal, setAgencyTotal] = useState<AgencyCommissionTotal | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMemberRow[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRuleForAssign, setSelectedRuleForAssign] = useState<CommissionRule | null>(null);
  const [selectedStaffForAssign, setSelectedStaffForAssign] = useState<string>('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CommissionRuleInput>({
    name: '',
    description: '',
    ruleType: 'sales',
    commissionType: 'percentage',
    baseValue: 0,
    appliesToAgent: true,
    appliesToSalesProgressor: false,
    splitPercentage: 100,
    isActive: true
  });

  useEffect(() => {
    if (agencyId) {
      loadData();
    }
  }, [agencyId]);

  const loadData = async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      const [rulesData, staffData, branchData, agencyData, staffMembersData] = await Promise.all([
        fetchCommissionRules(agencyId),
        fetchStaffCommissionTotals(agencyId),
        fetchBranchCommissionTotals(agencyId),
        fetchAgencyCommissionTotal(agencyId),
        fetchStaffMembers(agencyId)
      ]);
      setRules(rulesData);
      setStaffTotals(staffData);
      setBranchTotals(branchData);
      setAgencyTotal(agencyData);
      setStaffMembers(staffMembersData);
    } catch (error) {
      console.error('Error loading commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule?: CommissionRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        ruleType: rule.ruleType,
        commissionType: rule.commissionType,
        baseValue: rule.baseValue || 0,
        appliesToAgent: rule.appliesToAgent,
        appliesToSalesProgressor: rule.appliesToSalesProgressor,
        splitPercentage: rule.splitPercentage,
        isActive: rule.isActive
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        description: '',
        ruleType: 'sales',
        commissionType: 'percentage',
        baseValue: 0,
        appliesToAgent: true,
        appliesToSalesProgressor: false,
        splitPercentage: 100,
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!agencyId || !formData.name) return;

    try {
      if (editingRule) {
        await updateCommissionRule(editingRule.id, formData);
      } else {
        await createCommissionRule(agencyId, formData);
      }
      await loadData();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving commission rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const ok = await confirmDialog('Are you sure you want to delete this commission rule?', {
      title: 'Delete Commission Rule',
      confirmText: 'Delete',
      variant: 'destructive'
    });
    if (!ok) return;

    try {
      await deleteCommissionRule(ruleId);
      await loadData();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleOpenAssignDialog = (rule: CommissionRule) => {
    setSelectedRuleForAssign(rule);
    setSelectedStaffForAssign('');
    setAssignDialogOpen(true);
  };

  const handleAssignRuleToStaff = async () => {
    if (!selectedRuleForAssign || !selectedStaffForAssign) return;

    setAssigningLoading(true);
    try {
      await assignCommissionRuleToStaff({
        staffId: selectedStaffForAssign,
        ruleId: selectedRuleForAssign.id,
      });
      await loadData();
      setAssignDialogOpen(false);
      setSelectedRuleForAssign(null);
      setSelectedStaffForAssign('');
    } catch (error) {
      console.error('Error assigning rule to staff:', error);
    } finally {
      setAssigningLoading(false);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  if (!agencyId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading agency information...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BanknoteIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Commission</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(agencyTotal?.paidCommission || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(agencyTotal?.approvedCommission || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(agencyTotal?.pendingCommission || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUpIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(agencyTotal?.totalCommission || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <PercentIcon className="h-4 w-4" /> Rules
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" /> Staff
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <Building2Icon className="h-4 w-4" /> Branches
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Commission Rules</h3>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <PlusIcon className="h-4 w-4" /> Add Rule
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PercentIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>No commission rules set up yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                  Create your first rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{rule.ruleType}</Badge>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Type: <span className="text-foreground font-medium">{rule.commissionType}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Value: <span className="text-foreground font-medium">
                              {rule.commissionType === 'percentage' ? `${rule.baseValue}%` : formatCurrency(rule.baseValue || 0)}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            Split: <span className="text-foreground font-medium">{rule.splitPercentage}%</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenAssignDialog(rule)}>
                          <UsersIcon className="h-4 w-4 mr-1" /> Assign
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRule(rule.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-4">
          <h3 className="text-lg font-semibold">Staff Commission Totals</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : staffTotals.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>No staff commission data available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {staffTotals.map((staff) => (
                <Card key={staff.staffId} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{staff.staffName}</h4>
                        <p className="text-sm text-muted-foreground">{staff.branchName}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-6 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-semibold text-green-600">{formatCurrency(staff.paidCommission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Approved</p>
                          <p className="font-semibold text-blue-600">{formatCurrency(staff.approvedCommission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pending</p>
                          <p className="font-semibold text-amber-600">{formatCurrency(staff.pendingCommission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold">{formatCurrency(staff.totalCommission)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-4">
          <h3 className="text-lg font-semibold">Branch Commission Totals</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : branchTotals.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2Icon className="h-12 w-12 mb-4 opacity-50" />
                <p>No branch commission data available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {branchTotals.map((branch, idx) => (
                <Card key={idx} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{branch.branchName || 'Unknown Branch'}</h4>
                        <p className="text-sm text-muted-foreground">{branch.staffCount} staff members</p>
                      </div>
                      <div className="grid grid-cols-4 gap-6 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-semibold text-green-600">{formatCurrency(branch.paidCommission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Approved</p>
                          <p className="font-semibold text-blue-600">{formatCurrency(branch.approvedCommission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pending</p>
                          <p className="font-semibold text-amber-600">{formatCurrency(branch.pendingCommission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold">{formatCurrency(branch.totalCommission)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Commission Rule' : 'Create Commission Rule'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Sales Commission"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={formData.ruleType} onValueChange={(v: any) => setFormData({ ...formData, ruleType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="lettings">Lettings</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Commission Type</Label>
                <Select value={formData.commissionType} onValueChange={(v: any) => setFormData({ ...formData, commissionType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="tiered">Tiered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base-value">
                  {formData.commissionType === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (£)'}
                </Label>
                <Input
                  id="base-value"
                  type="number"
                  value={formData.baseValue}
                  onChange={(e) => setFormData({ ...formData, baseValue: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="split-percentage">Split Percentage (%)</Label>
                <Input
                  id="split-percentage"
                  type="number"
                  value={formData.splitPercentage}
                  onChange={(e) => setFormData({ ...formData, splitPercentage: parseFloat(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.appliesToAgent}
                  onChange={(e) => setFormData({ ...formData, appliesToAgent: e.target.checked })}
                  className="rounded"
                />
                Applies to Agent
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.appliesToSalesProgressor}
                  onChange={(e) => setFormData({ ...formData, appliesToSalesProgressor: e.target.checked })}
                  className="rounded"
                />
                Applies to Sales Progressor
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              Rule is Active
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} disabled={!formData.name}>
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Rule to Staff Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card">
          <DialogHeader>
            <DialogTitle>Assign Commission Rule to Staff</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedRuleForAssign && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-semibold">{selectedRuleForAssign.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedRuleForAssign.commissionType === 'percentage' 
                    ? `${selectedRuleForAssign.baseValue}% commission` 
                    : formatCurrency(selectedRuleForAssign.baseValue || 0)}
                  {' · '}{selectedRuleForAssign.ruleType}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Staff Member</Label>
              <Select value={selectedStaffForAssign} onValueChange={setSelectedStaffForAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name} · {staff.role} · {staff.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAssignRuleToStaff} 
              disabled={!selectedStaffForAssign || assigningLoading}
            >
              {assigningLoading ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Rule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
