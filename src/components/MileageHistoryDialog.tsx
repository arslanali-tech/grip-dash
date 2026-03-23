import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CarIcon, SearchIcon, DownloadIcon, TrashIcon, MapPinIcon, CalendarIcon } from 'lucide-react';
import { useMileageStore } from '@/stores/mileageStore';
import { format, parseISO, subMonths } from 'date-fns';

interface MileageHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MileageHistoryDialog({ open, onOpenChange }: MileageHistoryDialogProps) {
  const { logs, deleteLog } = useMileageStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Generate last 12 months for filter options
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy')
    };
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endLocation.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedMonth === 'all') return matchesSearch;

    const logDate = parseISO(log.date);
    const [year, month] = selectedMonth.split('-').map(Number);
    const matchesMonth = logDate.getFullYear() === year && logDate.getMonth() === (month - 1); // month is 0-indexed in Date

    return matchesSearch && matchesMonth;
  });

  const totalMiles = filteredLogs.reduce((sum, log) => sum + log.totalDistance, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] bg-card text-card-foreground max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CarIcon className="h-5 w-5 text-primary" />
              Mileage Logs
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                Total: {totalMiles.toFixed(1)} miles
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <DownloadIcon className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by staff or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px] bg-background">
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0">
                  <TableHead>Date</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {format(parseISO(log.date), 'dd MMM yyyy')}
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(log.date), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>{log.staffName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {log.startLocation}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="h-3 w-3 text-red-500" />
                            {log.endLocation}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          log.isReturnTrip 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {log.isReturnTrip ? 'Return' : 'Single'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {log.totalDistance.toFixed(1)} mi
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteLog(log.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No mileage logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
