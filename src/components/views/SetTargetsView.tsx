import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaveIcon, UsersIcon, Building2Icon, TargetIcon, Loader2Icon } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { isManagerLikeRole, isNegotiatorRole, isProspectingRole } from '@/lib/staffRoles';

type TargetFor = 'branch-owner' | 'staff' | 'prospector';

interface SetTargetsViewProps {
  agencyId?: string;
}

interface TargetState {
  salesTarget: number; // For Branch Owner
  lettingsTarget: number; // For Branch Owner
  revenueTarget: number; // For Branch Owner
  valuationsTarget: number; // Shared, but context-specific
  salesCompletedTarget: number; // For Staff/Prospector
  offersTarget: number; // For Staff/Prospector
}

const initialTargets: TargetState = {
  salesTarget: 50,
  lettingsTarget: 30,
  revenueTarget: 500000,
  valuationsTarget: 100,
  salesCompletedTarget: 10,
  offersTarget: 20,
};

export function SetTargetsView({ agencyId }: SetTargetsViewProps) {
  const { staffMembers, branches, loadingMovements } = useDashboardStore();
  const [targetFor, setTargetFor] = useState<TargetFor>('branch-owner');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedProspectorId, setSelectedProspectorId] = useState<string | null>(null);
  const [selectedBranchOwnerId, setSelectedBranchOwnerId] = useState<string | null>(null);
  const [targets, setTargets] = useState<TargetState>(initialTargets);
  const [saving, setSaving] = useState(false);

  // Filter staff members by role
  const { branchOwners, regularStaff, prospectors } = useMemo(() => {
    const staff = staffMembers ?? [];
    return {
      branchOwners: staff.filter((s) => isManagerLikeRole(s.role)),
      regularStaff: staff.filter(
        (s) =>
          isNegotiatorRole(s.role) ||
          s.role === 'Property Consultant' ||
          s.role === 'Lettings Specialist' ||
          s.role === 'Agent'
      ),
      prospectors: staff.filter((s) => isProspectingRole(s.role)),
    };
  }, [staffMembers]);

  const handleTargetChange = (field: keyof TargetState, value: string) => {
    setTargets(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSaveTargets = async () => {
    const staff = staffMembers ?? [];
    let targetEntity = '';
    let selectedId = '';
    
    if (targetFor === 'branch-owner' && selectedBranchOwnerId) {
      targetEntity = staff.find(s => s.id === selectedBranchOwnerId)?.name || 'Selected Branch Owner';
      selectedId = selectedBranchOwnerId;
    } else if (targetFor === 'staff' && selectedStaffId) {
      targetEntity = staff.find(s => s.id === selectedStaffId)?.name || 'Selected Staff';
      selectedId = selectedStaffId;
    } else if (targetFor === 'prospector' && selectedProspectorId) {
      targetEntity = staff.find(s => s.id === selectedProspectorId)?.name || 'Selected Prospector';
      selectedId = selectedProspectorId;
    } else {
      alert('Please select a target entity.');
      return;
    }

    setSaving(true);
    try {
      // TODO: Persist to Supabase targets table when available
      console.log(`Saving targets for ${targetEntity} (${selectedId}):`, targets);
      alert(`Targets saved for ${targetEntity}!`);
    } catch (error) {
      console.error('Error saving targets:', error);
      alert('Failed to save targets. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingMovements) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading staff data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10 max-w-3xl mx-auto">
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground text-2xl flex items-center gap-3">
            <TargetIcon className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
            Set Performance Targets
          </CardTitle>
          <p className="text-muted-foreground">
            Define clear targets for the overall business, individual staff members, or prospectors.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target For Selection */}
          <div className="space-y-2">
            <Label htmlFor="target-for" className="text-foreground">Set Targets For</Label>
            <Select value={targetFor} onValueChange={(value: TargetFor) => {
              setTargetFor(value);
              setSelectedStaffId(null);
              setSelectedProspectorId(null);
              setSelectedBranchOwnerId(null);
            }}>
              <SelectTrigger id="target-for" className="w-full bg-background text-foreground border-border">
                <SelectValue placeholder="Select target type" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="branch-owner">Branch Owner</SelectItem>
                <SelectItem value="staff">Staff Member</SelectItem>
                <SelectItem value="prospector">Prospector</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch Owner Selection (Conditional) */}
          {targetFor === 'branch-owner' && (
            <div className="space-y-2">
              <Label htmlFor="branch-owner-select" className="text-foreground">Select Branch Owner</Label>
              <Select value={selectedBranchOwnerId || ''} onValueChange={setSelectedBranchOwnerId}>
                <SelectTrigger id="branch-owner-select" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select a branch owner" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {branchOwners.length > 0 ? branchOwners.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.branch ?? staff.branch_name ?? 'N/A'})</SelectItem>
                  )) : <div className="p-2 text-sm text-muted-foreground">No branch owners found</div>}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Staff Member Selection (Conditional) */}
          {targetFor === 'staff' && (
            <div className="space-y-2">
              <Label htmlFor="staff-member-select" className="text-foreground">Select Staff Member</Label>
              <Select value={selectedStaffId || ''} onValueChange={setSelectedStaffId}>
                <SelectTrigger id="staff-member-select" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {regularStaff.length > 0 ? regularStaff.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.role})</SelectItem>
                  )) : <div className="p-2 text-sm text-muted-foreground">No staff members found</div>}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Prospector Selection (Conditional) */}
          {targetFor === 'prospector' && (
            <div className="space-y-2">
              <Label htmlFor="prospector-select" className="text-foreground">Select Prospector</Label>
              <Select value={selectedProspectorId || ''} onValueChange={setSelectedProspectorId}>
                <SelectTrigger id="prospector-select" className="w-full bg-background text-foreground border-border">
                  <SelectValue placeholder="Select a prospector" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  {prospectors.length > 0 ? prospectors.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.branch ?? staff.branch_name ?? 'N/A'})</SelectItem>
                  )) : <div className="p-2 text-sm text-muted-foreground">No prospectors found</div>}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Input Fields - Conditional based on targetFor */}
          {targetFor === 'branch-owner' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales-target" className="text-foreground">Sales Target</Label>
                <Input
                  id="sales-target"
                  type="number"
                  value={targets.salesTarget}
                  onChange={(e) => handleTargetChange('salesTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lettings-target" className="text-foreground">Lettings Target</Label>
                <Input
                  id="lettings-target"
                  type="number"
                  value={targets.lettingsTarget}
                  onChange={(e) => handleTargetChange('lettingsTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue-target" className="text-foreground">Revenue Target (£)</Label>
                <Input
                  id="revenue-target"
                  type="number"
                  value={targets.revenueTarget}
                  onChange={(e) => handleTargetChange('revenueTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valuations-target" className="text-foreground">Valuations Target</Label>
                <Input
                  id="valuations-target"
                  type="number"
                  value={targets.valuationsTarget}
                  onChange={(e) => handleTargetChange('valuationsTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          )}

          {(targetFor === 'staff' || targetFor === 'prospector') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valuations-target" className="text-foreground">Valuations Target</Label>
                <Input
                  id="valuations-target"
                  type="number"
                  value={targets.valuationsTarget}
                  onChange={(e) => handleTargetChange('valuationsTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-completed-target" className="text-foreground">Sales Completed Target</Label>
                <Input
                  id="sales-completed-target"
                  type="number"
                  value={targets.salesCompletedTarget}
                  onChange={(e) => handleTargetChange('salesCompletedTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offers-target" className="text-foreground">Offers Target</Label>
                <Input
                  id="offers-target"
                  type="number"
                  value={targets.offersTarget}
                  onChange={(e) => handleTargetChange('offersTarget', e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleSaveTargets}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <Loader2Icon className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.5} />
            ) : (
              <SaveIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            )}
            {saving ? 'Saving...' : 'Save Targets'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
