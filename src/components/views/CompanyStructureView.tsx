import React, { useEffect, useMemo, useState } from 'react';
import { Building2Icon, MapPinIcon, NetworkIcon, UserIcon, UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BranchRow,
  ClientBranchRow,
  ClientStaffRow,
  fetchBranches,
  fetchClientBranchesForAgency,
  fetchClientStaffForAgency,
  fetchStaffMembers,
  StaffMemberRow,
} from '@/lib/ownerApi';
import { isManagerLikeRole } from '@/lib/staffRoles';

interface CompanyStructureViewProps {
  agencyId?: string;
  companyName?: string;
  title?: string;
  branchName?: string;
}

interface CompanyStaffNode {
  id: string;
  name: string;
  role: string;
  type: 'staff';
  status: 'active' | 'away' | 'offline';
}

interface CompanyBranchNode {
  id: string;
  name: string;
  location: string;
  type: 'branch';
  staff: CompanyStaffNode[];
}

export function CompanyStructureView({
  agencyId,
  companyName = 'My Agency',
  title = 'Company Flow',
  branchName,
}: CompanyStructureViewProps) {
  const [branches, setBranches] = useState<CompanyBranchNode[]>([]);
  const [loading, setLoading] = useState(false);

  const mapStaffRow = (row: StaffMemberRow): CompanyStaffNode => ({
    id: row.id,
    name: row.name,
    role: row.role,
    type: 'staff',
    status: (row.status as CompanyStaffNode['status']) ?? 'active',
  });

  const mapBranchRow = (row: BranchRow): CompanyBranchNode => ({
    id: row.id,
    name: row.name,
    location: row.city ?? row.address ?? '—',
    type: 'branch',
    staff: [],
  });

  const mapClientStaffRow = (row: ClientStaffRow): CompanyStaffNode => ({
    id: row.id,
    name: row.name,
    role: row.role,
    type: 'staff',
    status: 'active',
  });

  const mapClientBranchRow = (row: ClientBranchRow): CompanyBranchNode => ({
    id: row.id,
    name: row.name,
    location: row.address ?? '—',
    type: 'branch',
    staff: [],
  });

  useEffect(() => {
    const load = async () => {
      if (!agencyId) {
        setBranches([]);
        return;
      }

      setLoading(true);
      try {
        // Prefer client-level hierarchy tables (current data model)
        const [clientBranchRows, clientStaffRows] = await Promise.all([
          fetchClientBranchesForAgency(agencyId),
          fetchClientStaffForAgency(agencyId),
        ]);

        let mappedBranches: CompanyBranchNode[] = [];

        if (clientBranchRows.length > 0) {
          const staffByBranchId = clientStaffRows.reduce<Record<string, CompanyStaffNode[]>>((acc, row) => {
            if (!row.branch_id) return acc;
            const mapped = mapClientStaffRow(row);
            acc[row.branch_id] = acc[row.branch_id] ? [...acc[row.branch_id], mapped] : [mapped];
            return acc;
          }, {});

          mappedBranches = clientBranchRows.map((b) => {
            const base = mapClientBranchRow(b);
            return {
              ...base,
              staff: staffByBranchId[base.id] ?? [],
            };
          });
        } else {
          // Fallback for legacy/owner setups using agency-level branches + staff_members
          const [branchRows, staffRows] = await Promise.all([
            fetchBranches(agencyId),
            fetchStaffMembers(agencyId),
          ]);

          const staffByBranch = staffRows.reduce<Record<string, CompanyStaffNode[]>>((acc, row) => {
            const key = row.branch_name;
            const mapped = mapStaffRow(row);
            acc[key] = acc[key] ? [...acc[key], mapped] : [mapped];
            return acc;
          }, {});

          mappedBranches = branchRows.map((b) => {
            const base = mapBranchRow(b);
            return {
              ...base,
              staff: staffByBranch[base.name] ?? [],
            };
          });
        }

        console.log('[CompanyStructureView] Loaded branches:', mappedBranches.length, mappedBranches);
        setBranches(mappedBranches);
      } catch (error) {
        console.error('[CompanyStructureView] Failed loading company flow', error);
        setBranches([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [agencyId]);

  // Filter branches if branchName is provided
  const displayBranches = useMemo(
    () =>
      branchName
        ? branches.filter((b) => b.name.trim().toLowerCase() === branchName.trim().toLowerCase())
        : branches,
    [branches, branchName]
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <NetworkIcon className="h-6 w-6 text-primary" />
          {title} - {companyName}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Visual hierarchy of {branchName ? 'branch' : 'branches'} and staff</p>
        {agencyId && loading && (
          <p className="text-muted-foreground text-xs mt-2">Loading structure…</p>
        )}
        {agencyId && !loading && displayBranches.length === 0 && (
          <p className="text-muted-foreground text-xs mt-2">No branches found for this agency.</p>
        )}
      </div>
      
      <div className="flex-1 bg-muted/10 overflow-x-auto overflow-y-auto">
        <div className="w-max min-w-full px-8 pt-8">
          <div className="flex flex-col items-center pb-12">
          
          {/* Root Node: Company Owner - Only show if NOT in branch view */}
          {!branchName && (
            <div className="relative z-10 mb-8">
              <Card className="w-64 border-2 border-primary/20 shadow-lg bg-card">
                <div className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <Building2Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{companyName}</h3>
                    <p className="text-sm text-muted-foreground">Head Office</p>
                  </div>
                  <Badge variant="outline" className="mt-1 bg-primary/5 text-primary border-primary/20">
                    Main Owner
                  </Badge>
                </div>
              </Card>
              {/* Vertical Line Down */}
              <div className="absolute left-1/2 top-full h-8 w-0.5 bg-border -translate-x-1/2"></div>
            </div>
          )}

          {/* Branches Container */}
          <div className="relative flex gap-8 items-start justify-center">
            {/* Horizontal Connecting Line - Only show if multiple branches AND not branch view */}
            {!branchName && displayBranches.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-border -translate-y-8 mx-[calc(100%/6)]" style={{ 
                 left: '16%', 
                 right: '16%' 
              }}></div>
            )}
            
            {/* Vertical line from root for single branch if root is shown */}
            {!branchName && displayBranches.length === 1 && (
               <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-border -translate-y-8"></div>
            )}

            {displayBranches.map((branch) => {
              // Identify Manager if in Branch View
              const manager = branchName ? branch.staff.find((s) => isManagerLikeRole(s.role)) : null;
              const staffList = branchName && manager ? branch.staff.filter(s => s.id !== manager.id) : branch.staff;

              return (
                <div key={branch.id} className="flex flex-col items-center relative">
                  {/* Vertical Line Up to Horizontal Line - Only if root is shown */}
                  {!branchName && (
                    <div className="absolute bottom-full left-1/2 h-8 w-0.5 bg-border -translate-x-1/2"></div>
                  )}
                  
                  {/* Node: Manager (Branch View) or Branch (Company View) */}
                  {branchName && manager ? (
                    <Card className="w-64 border-2 border-primary/20 shadow-lg bg-card mb-6 relative z-10">
                      <div className="p-4 flex flex-col items-center text-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-1">
                          <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{manager.name}</h3>
                          <p className="text-sm text-muted-foreground">{manager.role}</p>
                        </div>
                        <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          {branch.name}
                        </Badge>
                      </div>
                      {/* Vertical Line Down */}
                      <div className="absolute left-1/2 top-full h-6 w-0.5 bg-border -translate-x-1/2"></div>
                    </Card>
                  ) : (
                    <Card className="w-56 border border-border shadow-sm mb-6 bg-card hover:border-primary/50 transition-colors cursor-pointer group relative z-10">
                      <div className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40 transition-colors">
                          <MapPinIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-semibold text-sm text-foreground truncate">{branch.name}</h4>
                          <p className="text-xs text-muted-foreground">{branch.location}</p>
                        </div>
                      </div>
                      {/* Vertical Line Down */}
                      <div className="absolute left-1/2 top-full h-6 w-0.5 bg-border -translate-x-1/2"></div>
                    </Card>
                  )}

                  {/* Staff List */}
                  <div className="flex flex-col gap-3 w-full relative items-center">
                    {/* Vertical Line for Staff */}
                    <div className="absolute left-1/2 top-[-24px] bottom-4 w-0.5 bg-border -translate-x-1/2 -z-10"></div>

                    {staffList.map((staff) => (
                      <Card key={staff.id} className="w-56 border border-border/60 shadow-sm bg-card/50 hover:bg-card hover:border-primary/30 transition-all cursor-pointer relative z-0">
                        <div className="p-2.5 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 text-left flex-1">
                            <h5 className="font-medium text-sm text-foreground truncate">{staff.name}</h5>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{staff.role}</p>
                          </div>
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            staff.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                          )} title={staff.status} />
                        </div>
                      </Card>
                    ))}
                    
                    <Button variant="ghost" size="sm" className="w-56 mt-1 border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 h-8 text-xs">
                      <UsersIcon className="h-3 w-3 mr-1.5" /> View All Staff
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-border bg-muted/10 flex justify-between items-center">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span>Away</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-gray-400"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
