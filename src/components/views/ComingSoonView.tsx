import { ViewType } from '@/stores/dashboardStore';
import { BranchManagerViewType } from '@/stores/branchManagerStore';
import { NegotiatorViewType } from '@/stores/negotiatorStore';
import { OwnerViewType } from '@/stores/ownerStore';
import { ProspectorViewType } from '@/stores/prospectorStore';
import { Card, CardContent } from '@/components/ui/card';
import { AllViewTypes } from '@/lib/globalIconColors';

interface ComingSoonViewProps {
  view: AllViewTypes;
}

const viewLabels: Record<AllViewTypes, string> = {
  overview: 'Overview',
  movements: 'Movements',
  'business-analytics': 'Business Analytics',
  'business-manager': 'Business Manager',
  'branch-analytics': 'Branch Analytics',
  'my-analytics': 'My Analytics',
  'prospecting-analytics': 'Prospecting Analytics',
  'branch-league-table': 'Branch League Table',
  staff: 'Staff',
  branches: 'Branches',
  'buyers-sellers': 'Referrals',
  tasks: 'Tasks',
  'team-chat': 'Team Chat',
  'grip-dash': 'Grip Dashboard',
  settings: 'Settings',
  'house-keeping': 'House Keeping',
  'base-camp': 'Base Camp',
  clients: 'Clients',
  'create-order': 'Create Order',
  analytics: 'Analytics',
  passwords: 'Passwords',
  billing: 'Billing',
  'client-updates': 'Client Updates',
  'prospector-dash': 'Prospector Dashboard',
  'stationery-request': 'Stationery Request',
  'invoice-generator': 'Invoice Generator',
  'invoice-template': 'Invoice Templates',
  'compliance-documents': 'Compliance Documents',
  'compliance-tasks-list': 'Compliance Tasks List',
  'compliance-calendar': 'Compliance Calendar',
  'holiday-requests': 'Holiday Requests',
  'absence-bookings': 'Absence Bookings',
  'staff-reviews': 'Staff Reviews',
  'staff-assessments': 'Staff Assessments',
  'document-uploads': 'Document Uploads', // Ensure this is present
};

export function ComingSoonView({ view }: ComingSoonViewProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-card text-card-foreground">
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-12 text-center">
          <img
            src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_2.png"
            alt="empty state illustration"
            className="h-64 w-auto object-contain"
            loading="lazy"
          />
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              {viewLabels[view]} Coming Soon
            </h2>
            <p className="text-muted-foreground">
              We're working hard to bring you this feature. Stay tuned!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
