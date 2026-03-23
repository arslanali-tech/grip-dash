import { Card, CardContent } from '@/components/ui/card';
import { FileTextIcon } from 'lucide-react';

export function InvoiceTemplateView() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 relative z-10">
      <Card className="w-full max-w-2xl bg-card text-card-foreground">
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-12 text-center">
          <FileTextIcon className="h-24 w-24 text-muted-foreground" strokeWidth={1.5} />
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Invoice Templates
            </h2>
            <p className="text-muted-foreground">
              Manage and customize your invoice templates here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
