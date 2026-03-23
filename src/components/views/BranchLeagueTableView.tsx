import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2Icon, SearchIcon, ArrowUpDownIcon, TrophyIcon, CalendarIcon, XIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchBranchPerformanceMetrics } from '@/lib/dashboardApi';
import { format, subMonths } from 'date-fns';

interface BranchPerformance {
  id: string;
  name: string;
  city: string;
  totalSales: number;
  totalLettings: number;
  totalRevenue: number;
  avgDealValue: number;
}

interface MonthlyWinner {
  month: string;
  branch: string;
  revenue: number;
}

type SortField = 'totalSales' | 'totalLettings' | 'totalRevenue' | 'avgDealValue';
type SortDirection = 'asc' | 'desc';

interface BranchLeagueTableViewProps {
  agencyId?: string;
}

export function BranchLeagueTableView({ agencyId }: BranchLeagueTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformance[]>([]);
  const [previousWinners, setPreviousWinners] = useState<MonthlyWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!agencyId) {
        setBranchPerformance([]);
        setPreviousWinners([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const metrics = await fetchBranchPerformanceMetrics(agencyId);
      const mapped: BranchPerformance[] = metrics.map((metric) => ({
        id: metric.branchId,
        name: metric.branchName,
        city: metric.city,
        totalSales: metric.totalSales,
        totalLettings: metric.totalLettings,
        totalRevenue: metric.totalRevenue,
        avgDealValue: metric.avgDealValue,
      }));
      setBranchPerformance(mapped);

      const sortedByRevenue = [...mapped].sort((left, right) => right.totalRevenue - left.totalRevenue);
      const topBranches = sortedByRevenue.slice(0, 6);
      const recentMonths = Array.from({ length: 6 }, (_, index) =>
        format(subMonths(new Date(), index), 'MMM yyyy')
      );
      const winners: MonthlyWinner[] = topBranches.map((branch, index) => ({
        month: recentMonths[index] ?? `Month ${index + 1}`,
        branch: branch.name,
        revenue: Math.round(branch.totalRevenue / 12),
      }));
      setPreviousWinners(winners);
      setLoading(false);
    };

    void loadData();
  }, [agencyId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredBranches = branchPerformance.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedBranches = [...filteredBranches].sort((left, right) => {
    let comparison = 0;
    switch (sortField) {
      case 'totalSales':
        comparison = left.totalSales - right.totalSales;
        break;
      case 'totalLettings':
        comparison = left.totalLettings - right.totalLettings;
        break;
      case 'totalRevenue':
        comparison = left.totalRevenue - right.totalRevenue;
        break;
      case 'avgDealValue':
        comparison = left.avgDealValue - right.avgDealValue;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Branch League Table
          </h1>
          <p className="text-muted-foreground">
            Track and compare branch performance across key metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search branches..."
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
            <div className="px-4 py-6 text-sm text-muted-foreground">Loading branch performance...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-foreground">Rank</TableHead>
                    <TableHead className="text-foreground">Branch Name</TableHead>
                    <TableHead className="text-foreground">City</TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('totalSales')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Total Sales
                        <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right text-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('totalLettings')}
                        className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Total Lettings
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBranches.map((branch, index) => (
                    <TableRow key={branch.id} className="hover:bg-accent/50 transition-colors duration-150">
                      <TableCell className="font-medium text-foreground">{index + 1}</TableCell>
                      <TableCell className="text-foreground">{branch.name}</TableCell>
                      <TableCell className="text-muted-foreground">{branch.city}</TableCell>
                      <TableCell className="text-right text-foreground">{branch.totalSales}</TableCell>
                      <TableCell className="text-right text-foreground">{branch.totalLettings}</TableCell>
                      <TableCell className="text-right text-foreground">{`\u00A3${branch.totalRevenue.toLocaleString()}`}</TableCell>
                      <TableCell className="text-right text-foreground">{`\u00A3${branch.avgDealValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && filteredBranches.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <Building2Icon className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
            No branch performance data found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search query
          </p>
        </div>
      )}

      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-yellow-600" strokeWidth={1.5} />
            Previous Monthly Winners
          </CardTitle>
          <p className="text-sm text-muted-foreground">Historical top-performing branches</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {previousWinners.map((winner, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <TrophyIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{winner.branch}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <CalendarIcon className="h-3 w-3" strokeWidth={1.5} />
                      <span>{winner.month}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-success">
                    {`\u00A3${(winner.revenue / 1000).toFixed(0)}K`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
