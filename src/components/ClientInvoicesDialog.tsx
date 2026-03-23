import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileTextIcon, DownloadIcon, CheckCircle2Icon, ClockIcon, AlertCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { fetchClientInvoices, ClientInvoiceRow } from '@/lib/ownerApi';

interface ClientInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientInvoicesDialog({ open, onOpenChange, clientId, clientName }: ClientInvoicesDialogProps) {
  const [invoices, setInvoices] = useState<ClientInvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      const rows = await fetchClientInvoices(clientId);
      setInvoices(rows);
      setLoading(false);
    };
    void load();
  }, [open, clientId]);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1"><CheckCircle2Icon className="h-3 w-3" /> Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 gap-1"><ClockIcon className="h-3 w-3" /> Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1"><AlertCircleIcon className="h-3 w-3" /> Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileTextIcon className="h-5 w-5 text-green-600" />
            Invoices - {clientName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-foreground">Invoice #</TableHead>
                <TableHead className="text-foreground">Date</TableHead>
                <TableHead className="text-foreground">Due Date</TableHead>
                <TableHead className="text-foreground">Amount</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Loading invoices…
                  </TableCell>
                </TableRow>
              )}

              {!loading && invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No invoices found for this client yet.
                  </TableCell>
                </TableRow>
              )}

              {!loading && invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{invoice.invoice_number}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.invoice_date}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.due_date ?? '—'}</TableCell>
                  <TableCell className="text-foreground">£{Number(invoice.amount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status ?? 'pending')}</TableCell>
                  <TableCell className="text-right">
                    {invoice.pdf_url && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        title="Download PDF"
                        className="hover:bg-accent hover:text-accent-foreground"
                      >
                        <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
                          <DownloadIcon className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
