import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrophyIcon, SearchIcon, ArrowUpDownIcon, XIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StaffPerformance {
  id: string;
  name: string;
  role: string;
  branch: string;
  dealsClosed: number;
  totalRevenue: number;
  avgDealValue: number;
  conversionRate: number;
}

type SortField = 'dealsClosed' | 'totalRevenue' | 'avgDealValue' | 'conversionRate';
type SortDirection = 'asc' | 'desc';

interface StaffLeagueTableViewProps {
  agencyId?: string;
}

const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
const normalizeComparable = (value: string | null | undefined) =>
  normalizeText(value).replace(/[^a-z0-9]/g, '');
const isClosedStatus = (status: string | null | undefined) =>
  ['completed', 'exchanged', 'sale'].includes(normalizeText(status));

export function StaffLeagueTableView({ agencyId }: StaffLeagueTableViewProps) {
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const loadStaffPerformance = async () => {
      if (!agencyId) {
        setStaffPerformance([]);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('staff_performance_metrics')
          .select('*')
          .eq('agency_id', agencyId);

        if (error) {
          console.error('[StaffLeagueTableView] Error loading metrics view, using fallback:', error);
        }

        const fromView: StaffPerformance[] = (data || []).map((row: any) => ({
          id: row.staff_id,
          name: row.staff_name,
          role: row.role ?? 'Staff',
          branch: row.branch ?? 'Unassigned',
          dealsClosed: row.deals_closed || 0,
          totalRevenue: Number(row.total_revenue || 0),
          avgDealValue: Number(row.avg_deal_value || 0),
          conversionRate: Number(row.conversion_rate || 0),
        }));

        if (fromView.length > 0) {
          setStaffPerformance(fromView);
          return;
        }

        const [staffRowsResult, clientStaffRowsResult, movementsResult] = await Promise.all([
          supabase
            .from('staff_members')
            .select('id, name, role, branch_name')
            .eq('agency_id', agencyId),
          supabase
            .from('client_staff')
            .select('id, name, role, branch_id, client_branches(name), clients!inner(agency_id)')
            .eq('clients.agency_id', agencyId),
          supabase
            .from('movements')
            .select('agent, status, price, fee_amount')
            .eq('agency_id', agencyId),
        ]);

        if (staffRowsResult.error) {
          console.error('[StaffLeagueTableView] Error loading staff_members fallback:', staffRowsResult.error);
        }
        if (clientStaffRowsResult.error) {
          console.error('[StaffLeagueTableView] Error loading client_staff fallback:', clientStaffRowsResult.error);
        }
        if (movementsResult.error) {
          console.error('[StaffLeagueTableView] Error loading movements fallback:', movementsResult.error);
        }

        const mergedStaff = new Map<string, { id: string; name: string; role: string; branch: string }>();

        for (const row of (staffRowsResult.data ?? []) as Array<{ id: string; name: string; role: string; branch_name: string | null }>) {
          if (!row?.id || !row?.name) continue;
          mergedStaff.set(row.id, {
            id: row.id,
            name: row.name,
            role: row.role ?? 'Staff',
            branch: row.branch_name ?? 'Unassigned',
          });
        }

        for (const row of (clientStaffRowsResult.data ?? []) as Array<{
          id: string;
          name: string;
          role: string;
          client_branches?: { name: string } | null;
        }>) {
          if (!row?.id || !row?.name || mergedStaff.has(row.id)) continue;
          mergedStaff.set(row.id, {
            id: row.id,
            name: row.name,
            role: row.role ?? 'Staff',
            branch: row.client_branches?.name ?? 'Unassigned',
          });
        }

        const movementRows = (movementsResult.data ?? []) as Array<{
          agent: string | null;
          status: string | null;
          price: number | null;
          fee_amount: number | null;
        }>;

        const fallbackData: StaffPerformance[] = Array.from(mergedStaff.values()).map((staff) => {
          const staffKey = normalizeComparable(staff.name);
          const staffMovements = movementRows.filter((movement) => {
            const agentKey = normalizeComparable(movement.agent);
            if (!staffKey || !agentKey) return false;
            return agentKey === staffKey || agentKey.includes(staffKey) || staffKey.includes(agentKey);
          });
          const closedMovements = staffMovements.filter((movement) => isClosedStatus(movement.status));
          const dealsClosed = closedMovements.length;
          const totalRevenue = closedMovements.reduce(
            (sum, movement) => sum + Number(movement.fee_amount ?? movement.price ?? 0),
            0
          );
          const avgDealValue = dealsClosed > 0 ? totalRevenue / dealsClosed : 0;
          const conversionRate = staffMovements.length > 0 ? dealsClosed / staffMovements.length : 0;

          return {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            branch: staff.branch,
            dealsClosed,
            totalRevenue,
            avgDealValue,
            conversionRate,
          };
        });

        setStaffPerformance(fallbackData);
      } catch (error) {
        console.error('[StaffLeagueTableView] Unexpected error:', error);
        setStaffPerformance([]);
      } finally {
        setLoading(false);
      }
    };

    void loadStaffPerformance();
  }, [agencyId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredStaff = staffPerformance.filter((staff) =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'dealsClosed':
        comparison = a.dealsClosed - b.dealsClosed;
        break;
      case 'totalRevenue':
        comparison = a.totalRevenue - b.totalRevenue;
        break;
      case 'avgDealValue':
        comparison = a.avgDealValue - b.avgDealValue;
        break;
      case 'conversionRate':
        comparison = a.conversionRate - b.conversionRate;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Staff League Table
          </h1>
          <p className="text-muted-foreground">
            Track and compare individual staff performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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
        </div>
      </div>

      <Card className="bg-card text-card-foreground">
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Loading staff performance...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-foreground">Rank</TableHead>
                    <TableHead className="text-foreground">Staff Member</TableHead>
                    <TableHead className="text-foreground">Role</TableHead>
                    <TableHead className="text-foreground">Branch</TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('dealsClosed')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Deals Closed
                        <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('totalRevenue')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Total Revenue
                        <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('avgDealValue')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Avg. Deal Value
                        <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('conversionRate')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Conversion Rate
                        <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStaff.map((staff, index) => (
                    <TableRow key={staff.id} className="hover:bg-accent/50 transition-colors duration-150">
                      <TableCell className="font-medium text-foreground">{index + 1}</TableCell>
                      <TableCell className="text-foreground">{staff.name}</TableCell>
                      <TableCell className="text-muted-foreground">{staff.role}</TableCell>
                      <TableCell className="text-muted-foreground">{staff.branch}</TableCell>
                      <TableCell className="text-right text-foreground">{staff.dealsClosed}</TableCell>
                      <TableCell className="text-right text-foreground">{`\u00A3${staff.totalRevenue.toLocaleString()}`}</TableCell>
                      <TableCell className="text-right text-foreground">{`\u00A3${staff.avgDealValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</TableCell>
                      <TableCell className="text-right text-foreground">{(staff.conversionRate * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && filteredStaff.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <TrophyIcon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
            No staff performance data found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search query
          </p>
        </div>
      )}
    </div>
  );
}
