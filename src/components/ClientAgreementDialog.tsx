import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileTextIcon, DownloadIcon, PrinterIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClientAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function ClientAgreementDialog({ open, onOpenChange, clientName }: ClientAgreementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col bg-card text-card-foreground">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileTextIcon className="h-5 w-5 text-blue-600" />
            Service Agreement - {clientName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <PrinterIcon className="h-4 w-4" />
              Print
            </Button>
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <DownloadIcon className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 bg-muted/10 rounded-md border border-border mt-4">
          <div className="max-w-2xl mx-auto bg-white text-black p-8 shadow-sm min-h-[600px] text-sm space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl font-bold">SERVICE AGREEMENT</h1>
              <p className="text-gray-500">Agreement Reference: #GRIP-2024-001</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold uppercase text-xs text-gray-500">1. Parties</h3>
              <p>This Agreement is made between <strong>GRIP Software Solutions</strong> ("Provider") and <strong>{clientName}</strong> ("Client").</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold uppercase text-xs text-gray-500">2. Services</h3>
              <p>The Provider agrees to grant the Client access to the GRIP Estate Agency Management Platform, including the following modules:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Movements Dashboard</li>
                <li>Prospecting Tools</li>
                <li>Business Analytics</li>
                <li>Staff Management</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold uppercase text-xs text-gray-500">3. Term</h3>
              <p>This Agreement shall commence on <strong>{new Date().toLocaleDateString()}</strong> and continue for an initial term of 12 months.</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold uppercase text-xs text-gray-500">4. Fees</h3>
              <p>The Client agrees to pay the monthly subscription fee as set out in the attached Schedule A, payable in advance on the 1st of each month.</p>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between">
              <div className="space-y-2">
                <div className="h-12 border-b border-black w-48"></div>
                <p className="text-xs uppercase">Signed for GRIP Software Solutions</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 border-b border-black w-48"></div>
                <p className="text-xs uppercase">Signed for {clientName}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
